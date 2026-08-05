/**
 * PORTED from the Express backend: controllers/Authentication.js
 *
 * Converted CommonJS -> ESM. Handler bodies are otherwise unchanged: they still
 * take (req, res) and still read req.cookies / req.body / req.files, which the
 * express-adapter shim supplies. Do not "modernise" them in place — the value of
 * this file is that it is diffable against the original.
 */

import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  AdminUserGlobalSignOutCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  DeleteItemCommand,
  UpdateItemCommand,
  TransactWriteItemsCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

import { getS3, getDynamo, getSes, getCognito } from '../aws';
import { ensureUserProvisioned } from '../user-provisioning';
import { getSupabase } from '../supabase';
import { getStripe, getConnectStripe, getWebhookSecret } from '../stripe';
import {
  getCookieOptions,
  setAwaitingVerificationCookies,
} from '../cookies';
import {
  APP_AWS_REGION as REGION,
  COGNITO_CLIENT_ID as CLIENT_ID,
  COGNITO_USER_POOL_ID as USERPOOL_ID,
  SHOP_IMAGES_BUCKET,
  REWARD_IMAGES_BUCKET,
  MENU_BUCKET,
  LIVE_IMAGES_BUCKET,
  CLOUDFRONT_DOMAIN,
} from '../env';
import { s3PublicUrl, cloudfrontUrl } from '../s3-keys';
import { mapWithConcurrency } from '../concurrency';
import {
  AppError,
  ERROR_TYPES,
  createSuccessResponse,
  createValidationError,
  createAuthError,
  createAuthorizationError,
  createNotFoundError,
  createConflictError,
  createDatabaseError,
  createExternalServiceError,
  asyncHandler,
} from '../errors';
import { recordActivity } from './activityLog';
import * as stripeConnectController from './stripeConnect';
import {
  getStripeID,
  updateCustomerSubscriptionStatus,
  updateItem,
  putInvoiceItem,
  getPaymentFailedEmailSent,
  setPaymentFailedEmailSent,
  setShopUpgradePaymentStatus,
  getShopUpgradePaymentStatus,
} from './commonFunctions';

const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getSupabase();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

const stripe = new Proxy(
  {},
  {
    get(_target, prop) {
      return getStripe()[prop];
    },
  }
);

const client = { send: (command) => getDynamo().send(command) };

const s3 = { send: (command) => getS3().send(command) };

const cognitoClient = { send: (command) => getCognito().send(command) };

/** The Users table is keyed on the lowercased email. */
const toUserId = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);

const resendCodeLogic = async (username) => {
  if (!username) {
    throw new Error('Username is required to resend code');
  }

  const params = {
    ClientId: CLIENT_ID,
    Username: username,
  };

  const command = new ResendConfirmationCodeCommand(params);
  return await cognitoClient.send(command);
};

export const signIn = asyncHandler(async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw createValidationError("Username and password are required");
  }

  const params = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  };

  try {
    const command = new InitiateAuthCommand(params);
    const data = await cognitoClient.send(command);

    if (!data.AuthenticationResult) {
      throw createAuthError("Authentication failed");
    }

    const { AccessToken, IdToken, RefreshToken } = data.AuthenticationResult;

    let provisionedUser;
    try {
      provisionedUser = await ensureUserProvisioned(username);
    } catch (provisionError) {
      throw createDatabaseError(
        "provision user and shop",
        provisionError,
        "exports.signIn"
      );
    }

    const { user_id, role, shop_id } = provisionedUser;

    // Set the complete session only after app-level provisioning succeeds.
    res.cookie("accessToken", AccessToken, getCookieOptions({
      httpOnly: true,
      maxAge: 3600 * 1000, // 1 hour
    }));

    res.cookie("idToken", IdToken, getCookieOptions({
      httpOnly: true,
      maxAge: 3600 * 1000, // 1 hour
    }));

    res.cookie("refreshToken", RefreshToken, getCookieOptions({
      httpOnly: true,
      maxAge: 7 * 24 * 3600 * 1000, // 7 days
    }));

    res.cookie('userDataHTTP', JSON.stringify({ user_id, role, shop_id }), getCookieOptions({
      httpOnly: true,
      maxAge: 3600 * 1000,
    }));

    res.cookie('userDataNonHTTP', JSON.stringify({ user_id, role, shop_id }), getCookieOptions({
      httpOnly: false,
      maxAge: 3600 * 1000,
    }));

    res.status(200).json(createSuccessResponse("Sign-in successful"));
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    
    console.error("Sign-in error:", err);

    // Handle incorrect username/password - extract the meaningful message
    if (err.name === 'NotAuthorizedException') {
      const errorMessage = err.message || 'Incorrect username or password';
      throw createAuthError(errorMessage);
    }

    // Handle user not found
    if (err.name === 'UserNotFoundException') {
      const errorMessage = err.message || 'User not found';
      throw createAuthError(errorMessage);
    }

    // Handle unconfirmed user
    if (err.name === 'UserNotConfirmedException' || err.message?.includes("confirmed")) {
      try {
        const result = await resendCodeLogic(username);
        setAwaitingVerificationCookies(res, username, username);
        res.status(200).json(createSuccessResponse("Verification code resent successfully", { result }));
        return;
      } catch (resendErr) {
        console.error("Error resending code:", resendErr);
        throw createExternalServiceError("AWS Cognito", "resend verification code", resendErr, "exports.signIn");
      }
    }

    throw createExternalServiceError("AWS Cognito", "sign in", err, "exports.signIn");
  }
});


const doesUserExist = async (email) => {
  if (!email) {
    throw createValidationError("Email is required");
  }

  const params = {
    TableName: "Users",
    Key: {
      user_id: { S: toUserId(email) },
    },
  };

  try {
    const command = new GetItemCommand(params);
    const data = await client.send(command);

    return Boolean(data.Item); // Returns true if Item exists, false otherwise
  } catch (error) {
    console.error('Error checking user existence:', error);
    throw createDatabaseError("check user existence", error, "doesUserExist");
  }
};
export const retrieve = asyncHandler(async (req, res) => {
  // Extract the email from the request body
  const username = req.body.username;

  // Validate the input
  if (!username) {
    throw createValidationError("Email is required");
  }

  const params = {
    TableName: 'Users',
    Key: {
      user_id: { S: toUserId(username) },
    },
  };

  try {
    console.log('Sending query with params:', params);

    // Execute the GetItem command
    const command = new GetItemCommand(params);
    const response = await client.send(command);

    console.log('DynamoDB response:', response);

    if (response.Item) {
      // Unmarshall the DynamoDB item to a standard JavaScript object
      const unmarshalledItem = unmarshall(response.Item);
      console.log('Retrieved item:', unmarshalledItem);

      const { user_id, role } = unmarshalledItem;

      // Set cookies with new names
      res.cookie('userDataHTTP', JSON.stringify({ user_id, role }), getCookieOptions({
        httpOnly: true, // HTTP-only cookie
        maxAge: 3600 * 1000, // 1 hour - same as accessToken
      }));

      res.cookie('userDataNonHTTP', JSON.stringify({ user_id, role }), getCookieOptions({
        httpOnly: false, // Accessible by JavaScript on the client-side
        maxAge: 3600 * 1000, // 1 hour - same as accessToken
      }));

      // Return the unmarshalled item in the response
      res.status(200).json(createSuccessResponse("User retrieved successfully", unmarshalledItem));
    } else {
      console.log('No item found for the given key.');
      throw createNotFoundError("User");
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Error retrieving item:', error);
    throw createDatabaseError("retrieve user", error, "exports.retrieve");
  }
});







export const insert = asyncHandler(async (email) => {
  if (!email) {
    throw createValidationError("Email is required");
  }

  const newUuid = uuidv4();

  const params = {
    TableName: "Users",
    Item: {
      user_id: { S: toUserId(email) },
      shop_id: { S: newUuid },
      role: { S: "Owner" },
    },
  };

  const param2 = {
    TableName: "Shops",
    Item: {
      shop_id: { S: newUuid },
      NumberOfUsers : { N:"1" },
      SubscriptionStatus : {S:"NO"}
    },
  };

  try {
  const exists = await doesUserExist(email);
  if (!exists) {
    console.log("User does not exist.");
      
      const command = new PutItemCommand(params);
      await client.send(command);

      const command2 = new PutItemCommand(param2);
      await client.send(command2);

      return { success: true, message: "Data added successfully" };
  } else {
    console.log("User exists.");
    return { success: false, message: "Data already exists" };
  }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw createDatabaseError("insert user data", error, "exports.insert");
  }
});


export const signUp = asyncHandler(async (req, res, next) => {
  const signUpUser = async (username, password, email) => {
    email = email.toLowerCase();

    const params = {
      ClientId: CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email',
           Value: email },
      ],
    };

    try {
      const command = new SignUpCommand(params);
      const data = await cognitoClient.send(command);
      return data;
    } catch (err) {
      throw err;
    }
  };

    const { password, email } = req.body;
    const username = email;
    
    // Validate required fields
    if (!password || !email) {
      throw createValidationError("Password and email are required");
    }

    // Enforce basic password strength: at least one number, one special character,
    // one uppercase letter, and one lowercase letter.
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
    if (!passwordPattern.test(password)) {
      throw createValidationError(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      );
    }

  try {
    // Attempt to sign up the user
    const result = await signUpUser(username, password, email);

    // Set cookies before sending the response
    setAwaitingVerificationCookies(res, email, result.UserSub);

    // Send the final response
    res.status(200).json(createSuccessResponse("User signed up successfully"));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    console.error('Error signing up user:', error);
    throw createExternalServiceError("AWS Cognito", "sign up", error, "exports.signUp");
  }
});

export const confirm = asyncHandler(async (req, res, next) => {
  const { username, confirmationCode } = req.body;

  if (!username || !confirmationCode) {
    throw createValidationError("Username and confirmationCode are required");
  }

  const params = {
    ClientId: CLIENT_ID,
    Username: username,
    ConfirmationCode: confirmationCode,
  };

  try {
    const command = new ConfirmSignUpCommand(params);
    await cognitoClient.send(command);
    res.status(200).json(createSuccessResponse("User confirmed successfully"));
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw createExternalServiceError("AWS Cognito", "confirm user", err, "exports.confirm");
  }
});


export const resendCode = asyncHandler(async (req, res, next) => {
  const { username } = req.body;

  if (!username) {
    throw createValidationError("Username is required");
  }

  try {
    const result = await resendCodeLogic(username);
    res.status(200).json(createSuccessResponse("Verification code resent successfully", { result }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw createExternalServiceError("AWS Cognito", "resend verification code", error, "exports.resendCode");
  }
});


export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { username } = req.body;

  if (!username) {
    throw createValidationError("Username is required");
  }

  const params = {
    ClientId: CLIENT_ID,
    Username: username,
  };

  try {
    const command = new ForgotPasswordCommand(params);
    const response = await cognitoClient.send(command);
    res.status(200).json(createSuccessResponse("Verification code sent", { details: response }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw createExternalServiceError("AWS Cognito", "forgot password", error, "exports.forgotPassword");
  }
});


export const confirmForgotPassword = asyncHandler(async (req, res, next) => {
  const { username, newPassword, confirmationCode } = req.body;

  if (!username || !newPassword || !confirmationCode) {
    throw createValidationError("All fields are required");
  }

  const params = {
    ClientId: CLIENT_ID,
    Username: username,
    Password: newPassword,
    ConfirmationCode: confirmationCode,
  };

  try {
    const command = new ConfirmForgotPasswordCommand(params);
    const response = await cognitoClient.send(command);
    res.status(200).json(createSuccessResponse("Password reset successful", { details: response }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw createExternalServiceError("AWS Cognito", "confirm forgot password", error, "exports.confirmForgotPassword");
  }
});

export const signOutUser = asyncHandler(async (req, res, next) => {
  try {
    Object.keys(req.cookies).forEach((cookie) => {
      res.clearCookie(cookie, { path: '/' });
    });
    res.status(200).json(createSuccessResponse("Signed out successfully"));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw createDatabaseError("sign out user", error, "exports.signOutUser");
  }
});


export const globalSignOut = asyncHandler(async (req, res, next) => {
  // Extract the userDataNonHTTP cookie
  const userDataNonHTTP = req.cookies.userDataHTTP;

  if (!userDataNonHTTP) {
    throw createValidationError("Missing required cookie: userDataHTTP");
  }

  let userId;
  try {
    // Parse the cookie data as JSON
    const parsedData = JSON.parse(userDataNonHTTP);
    userId = parsedData.user_id; // Access the user_id field

    if (!userId) {
      throw createValidationError("user_id not found in the userDataHTTP cookie");
    }
  } catch (error) {
    throw createValidationError("Invalid userDataHTTP cookie format");
  }

  const params = {
    UserPoolId: USERPOOL_ID,
    Username: userId, // Using the extracted user_id as the username
  };

  try {
    // Create the command
    const command = new AdminUserGlobalSignOutCommand(params);

    // Send the command using the Cognito client
    const result = await cognitoClient.send(command);
    Object.keys(req.cookies).forEach((cookie) => {
      res.clearCookie(cookie, { path: '/' });
    });

    res.status(200).json(createSuccessResponse(`User '${userId}' has been globally signed out successfully`));
  } catch (error) {
    console.error('Error during global signout:', error.message);
    throw createExternalServiceError("AWS Cognito", "global sign out", error, "exports.globalSignOut");
  }
});



export const postDataForBusiness = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Cookie 'userDataHTTP' not found");
  }
  
  let userData;
  try {
    userData = JSON.parse(cookie).shop_id;
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

    const data = req.body;
  
  if (!data.businessName || !data.uen || !data.address) {
    throw createValidationError("Missing required fields: businessName, uen, and address are required");
  }

  // Check if all 5 required fields are not empty (building name is optional)
  const requiredFields = [
    data.businessName,
    data.uen,
    data.address?.unitNumber,
    data.address?.streetAddress,
    data.address?.postalCode
  ];
  
  const hasAllRequiredField = requiredFields.every(field => 
    field !== undefined && field !== null && String(field).trim() !== ""
  );

    const params = {
      TableName: "businessinformations",
        Item: {
      shop_id: {S: userData},
          businessName: { S: data.businessName },
          uen: { S: data.uen },
      addressUnitNumber: { S: data.address.unitNumber },
      addressBuildingName: { S: data.address?.buildingName != null ? String(data.address.buildingName) : "" },
      addressStreetAddress: {S: data.address.streetAddress},
      addressPostalCode: {S: data.address.postalCode},
      isBusinessDetailApproved: {S: data.isBusinessDetailsApproved},
      hasAllRequiredField: { BOOL: hasAllRequiredField }
    },
  };

      try {
        await client.send(new PutItemCommand(params));
    res.status(200).json(createSuccessResponse("Business information stored successfully"));
      } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error adding business information:", error);
    throw createDatabaseError("store business information", error, "exports.postDataForBusiness");
  }
});
// multer removed: withApi({ body: 'form' }) handles multipart via request.formData().

const parseLocationPayload = (locationInput) => {
  if (!locationInput) {
    return null;
  }

  let parsedLocation = locationInput;
  if (typeof locationInput === "string") {
    try {
      parsedLocation = JSON.parse(locationInput);
    } catch (error) {
      throw createValidationError("Invalid location JSON format");
    }
  }

  if (Array.isArray(parsedLocation)) {
    parsedLocation = parsedLocation[0] || null;
  }

  if (!parsedLocation || typeof parsedLocation !== "object" || Array.isArray(parsedLocation)) {
    throw createValidationError("Location must be a JSON object");
  }

  return parsedLocation;
};

const formatLocationAttribute = (locationInput) => {
  const parsedLocation = parseLocationPayload(locationInput);
  if (!parsedLocation) {
    return null;
  }

  return { M: marshall(parsedLocation, { removeUndefinedValues: true }) };
};

const formatLocationsListAttribute = (locationInput) => {
  const formattedLocation = formatLocationAttribute(locationInput);
  if (!formattedLocation) {
    return null;
  }
  return { L: [formattedLocation] };
};

export const PostCustomerDetails = asyncHandler(async (req, res, next) => {
  const shop_id = req.cookies.userDataHTTP;
  
  if (!shop_id) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(shop_id).shop_id;
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  console.log("Uploaded files:", req.files);

  const { displayName, description, website, category, halalcertified, keywords, location, locations, instagram, facebook, whatsapp, tiktok, phoneNumber } = req.body;

  // Check if at least one field is provided
  const locationInput = location ?? locations;
  const hasTextFields = displayName || description || website || category || halalcertified || keywords || locationInput || instagram || facebook || whatsapp || tiktok || phoneNumber;
  const hasFileUploads = req.files && (req.files.banner || req.files.thumbnail);
  
  if (!hasTextFields && !hasFileUploads) {
    throw createValidationError("At least one field must be provided");
  }

  // Note: hasAllRequiredField will be calculated after file uploads (banner and thumbnail)

  try {
    let banner = "";
    let thumbnail = "";

    // Handle file uploads
    for (const fieldName of ['banner', 'thumbnail']) {
      if (!req.files[fieldName]) {
            continue; // Skip saving to S3 if the file is empty
      }
      const file = req.files[fieldName][0];

      const image_type = fieldName; // This will be either 'banner' or 'thumbnail'
      const fileKey = `${userData}_${image_type}`;

      const uploadParams = {
        Bucket: "collbine-forbusiness-shop-images",
        Key: fileKey,
        Body: file.buffer,  // Directly use buffer for in-memory storage
        ContentType: file.mimetype,
      };

      // Upload to S3
      await s3.send(new PutObjectCommand(uploadParams));

      // Save URL in respective variable
      if (fieldName === 'banner') {
        banner = s3PublicUrl(SHOP_IMAGES_BUCKET, fileKey);
      } else if (fieldName === 'thumbnail') {
        thumbnail = s3PublicUrl(SHOP_IMAGES_BUCKET, fileKey);
      }
    }

    const formattedLocation = formatLocationAttribute(locationInput);

    // Build item with only provided fields
    const item = {
      shop_id: { S: userData }
    };
    
    // Only add fields that are provided
    if (displayName) item.displayName = { S: displayName };
    if (description) item.description = { S: description };
    if (website) item.website = { S: website };
    if (category) item.category = { S: category };
    if (halalcertified) item.halalcertified = { S: halalcertified };
    if (keywords) item.keywords = { S: keywords };
    if (instagram) item.instagram = { S: instagram };
    if (facebook) item.facebook = { S: facebook };
    if (whatsapp) item.whatsapp = { S: whatsapp };
    if (tiktok) item.tiktok = { S: tiktok };
    if (phoneNumber) item.phoneNumber = { S: phoneNumber };
    if (thumbnail) item.thumbnail = { S: thumbnail };
    if (banner) item.banner = { S: banner };
    if (formattedLocation) {
      item.location = formattedLocation;
      // Keep legacy shape for endpoints/clients still using `locations`
      item.locations = { L: [formattedLocation] };
    }
    
    // Check if all 4 required fields are filled: displayName, description, banner, thumbnail
    const allRequiredFields = [
      displayName,
      description,
      banner,
      thumbnail
    ];
    
    const hasAllRequiredField = allRequiredFields.every(field => 
      field !== undefined && field !== null && String(field).trim() !== ""
    );
    
    // Set hasAllRequiredField based on all required fields
    item.hasAllRequiredField = { BOOL: hasAllRequiredField };

    const params = {
      TableName: "CustomerFacingDetails",
      Item: item
    };

        await client.send(new PutItemCommand(params));
    res.status(200).json(createSuccessResponse("Customer details stored successfully"));
      } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error storing customer details:", error);
    throw createDatabaseError("store customer details", error, "exports.PostCustomerDetails");
  }
});

// Post QR Code
export const PostQRCode = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Cookie 'userDataHTTP' not found");
  }
  
  let shop_id;
  try {
    shop_id = JSON.parse(cookie).shop_id;
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  const { qr_code_name } = req.body;
  
  if (!qr_code_name || String(qr_code_name).trim() === "") {
    throw createValidationError("qr_code_name is required");
  }

  // Enforce a maximum of 3 QR codes per shop
  try {
    let existingCount = 0;

    // Try querying by shop_id using GSI first
    const queryParams = {
      TableName: "qr_code",
      IndexName: "shop_id-index", // Assuming GSI exists on shop_id
      KeyConditionExpression: "shop_id = :shopId",
      ExpressionAttributeValues: {
        ":shopId": { S: shop_id }
      }
    };

    try {
      const { Items } = await client.send(new QueryCommand(queryParams));
      existingCount = Items ? Items.length : 0;
    } catch (queryError) {
      // If GSI doesn't exist, fall back to ScanCommand with FilterExpression
      if (queryError.name === "ValidationException" || (queryError.message && queryError.message.includes("index"))) {
        const scanParams = {
          TableName: "qr_code",
          FilterExpression: "shop_id = :shopId",
          ExpressionAttributeValues: {
            ":shopId": { S: shop_id }
          }
        };

        const { Items } = await client.send(new ScanCommand(scanParams));
        existingCount = Items ? Items.length : 0;
      } else {
        throw queryError;
      }
    }

    if (existingCount >= 4) {
      throw createValidationError("Maximum number of QR codes reached. Please delete an existing QR code before creating a new one.");
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error checking existing QR codes before creation:", error);
    throw createDatabaseError("check existing QR codes", error, "exports.PostQRCode");
  }

  // Generate UUID for qr_code_id
  const qr_code_id = uuidv4();

  const params = {
    TableName: "qr_code",
    Item: {
      qr_code_id: { S: qr_code_id },
      shop_id: { S: shop_id },
      qr_code_name: { S: String(qr_code_name).trim() },
      created_at: { S: new Date().toISOString() }
    }
  };

  try {
    await client.send(new PutItemCommand(params));
    res.status(201).json(createSuccessResponse("QR code created successfully", {
      qr_code_id: qr_code_id,
      qr_code_name: qr_code_name
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error creating QR code:", error);
    throw createDatabaseError("create QR code", error, "exports.PostQRCode");
  }
});

// Get all QR codes by shop_id
export const GetQRCodes = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Cookie 'userDataHTTP' not found");
  }
  
  let shop_id;
  try {
    shop_id = JSON.parse(cookie).shop_id;
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  try {
    // Query QR codes by shop_id using GSI (Global Secondary Index)
    // If GSI doesn't exist, this will need to be changed to ScanCommand with FilterExpression
    const params = {
      TableName: "qr_code",
      IndexName: "shop_id-index", // Assuming GSI exists on shop_id
      KeyConditionExpression: "shop_id = :shopId",
      ExpressionAttributeValues: {
        ":shopId": { S: shop_id }
      }
    };

    let qrCodes = [];
    
    try {
      const { Items } = await client.send(new QueryCommand(params));
      
      if (Items && Items.length > 0) {
        qrCodes = Items.map((item) => {
          let cleanedItem = {};
          for (let key in item) {
            if (typeof item[key] === "object" && item[key].S !== undefined) {
              cleanedItem[key] = item[key].S;
            } else if (typeof item[key] === "object" && item[key].BOOL !== undefined) {
              cleanedItem[key] = item[key].BOOL;
            } else {
              cleanedItem[key] = item[key];
            }
          }
          return cleanedItem;
        });
      }
    } catch (queryError) {
      // If GSI doesn't exist, fall back to ScanCommand with FilterExpression
      if (queryError.name === 'ValidationException' || queryError.message.includes('index')) {
        console.log("GSI not found, using ScanCommand instead");
        const scanParams = {
          TableName: "qr_code",
          FilterExpression: "shop_id = :shopId",
          ExpressionAttributeValues: {
            ":shopId": { S: shop_id }
          }
        };
        
        const { Items } = await client.send(new ScanCommand(scanParams));
        
        if (Items && Items.length > 0) {
          qrCodes = Items.map((item) => {
            let cleanedItem = {};
            for (let key in item) {
              if (typeof item[key] === "object" && item[key].S !== undefined) {
                cleanedItem[key] = item[key].S;
              } else if (typeof item[key] === "object" && item[key].BOOL !== undefined) {
                cleanedItem[key] = item[key].BOOL;
              } else {
                cleanedItem[key] = item[key];
              }
            }
            return cleanedItem;
          });
        }
      } else {
        throw queryError;
      }
    }

    res.status(200).json(createSuccessResponse("QR codes retrieved successfully", qrCodes));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error retrieving QR codes:", error);
    throw createDatabaseError("retrieve QR codes", error, "exports.GetQRCodes");
  }
});

// Update QR code
export const UpdateQRCode = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Cookie 'userDataHTTP' not found");
  }
  
  let shop_id;
  try {
    shop_id = JSON.parse(cookie).shop_id;
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  const { qr_code_id, qr_code_name } = req.body;
  
  if (!qr_code_id) {
    throw createValidationError("qr_code_id is required");
  }
  
  if (!qr_code_name || String(qr_code_name).trim() === "") {
    throw createValidationError("qr_code_name is required");
  }

  try {
    // First, verify the QR code exists and belongs to this shop_id
    const getParams = {
      TableName: "qr_code",
      Key: {
        shop_id: { S: shop_id },
        qr_code_id: { S: qr_code_id }
      }
    };

    const { Item } = await client.send(new GetItemCommand(getParams));

    if (!Item) {
      throw createNotFoundError("QR code not found");
    }

    // Verify the QR code belongs to this shop
    const itemShopId = Item.shop_id?.S;
    if (itemShopId !== shop_id) {
      throw createAuthError("QR code does not belong to this shop");
    }

    // Update the QR code name
    const updateParams = {
      TableName: "qr_code",
      Key: {
        shop_id: { S: shop_id },
        qr_code_id: { S: qr_code_id }
      },
      UpdateExpression: "SET qr_code_name = :qr_code_name",
      ExpressionAttributeValues: {
        ":qr_code_name": { S: String(qr_code_name).trim() }
      },
      ReturnValues: "ALL_NEW"
    };

    const { Attributes } = await client.send(new UpdateItemCommand(updateParams));

    // Clean the response data
    let cleanedData = {};
    if (Attributes) {
      for (let key in Attributes) {
        if (typeof Attributes[key] === "object" && Attributes[key].S !== undefined) {
          cleanedData[key] = Attributes[key].S;
        } else if (typeof Attributes[key] === "object" && Attributes[key].BOOL !== undefined) {
          cleanedData[key] = Attributes[key].BOOL;
        } else {
          cleanedData[key] = Attributes[key];
        }
      }
    }

    res.status(200).json(createSuccessResponse("QR code updated successfully", cleanedData));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error updating QR code:", error);
    throw createDatabaseError("update QR code", error, "exports.UpdateQRCode");
  }
});

// Delete QR code
export const DeleteQRCode = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Cookie 'userDataHTTP' not found");
  }
  
  let shop_id;
  try {
    shop_id = JSON.parse(cookie).shop_id;
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  const { qr_code_id } = req.body;
  
  if (!qr_code_id) {
    throw createValidationError("qr_code_id is required");
  }

  try {
    // First, verify the QR code exists and belongs to this shop_id
    const getParams = {
      TableName: "qr_code",
      Key: {
        shop_id: { S: shop_id },
        qr_code_id: { S: qr_code_id }
      }
    };

    const { Item } = await client.send(new GetItemCommand(getParams));

    if (!Item) {
      throw createNotFoundError("QR code not found");
    }

    // Verify the QR code belongs to this shop
    const itemShopId = Item.shop_id?.S;
    if (itemShopId !== shop_id) {
      throw createAuthError("QR code does not belong to this shop");
    }

    // Delete the QR code
    const deleteParams = {
      TableName: "qr_code",
      Key: {
        shop_id: { S: shop_id },
        qr_code_id: { S: qr_code_id }
      }
    };

    await client.send(new DeleteItemCommand(deleteParams));

    res.status(200).json(createSuccessResponse("QR code deleted successfully", {
      qr_code_id: qr_code_id
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error deleting QR code:", error);
    throw createDatabaseError("delete QR code", error, "exports.DeleteQRCode");
  }
});

// Post QR Code Configuration
export const PostQRCodeConfiguration = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Cookie 'userDataHTTP' not found");
  }
  
  let shop_id;
  try {
    shop_id = JSON.parse(cookie).shop_id;
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  const { isEnabled, rewardChances } = req.body;

  let cardImageUrl = "";

  try {
    // Handle cardImage file upload if provided
    if (req.file) {
      const file = req.file;
      const fileKey = `${shop_id}_qr_card_image`;

      const uploadParams = {
        Bucket: "collbine-forbusiness-shop-images",
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      // Upload to S3
      await s3.send(new PutObjectCommand(uploadParams));

      // Save full URL
      cardImageUrl = s3PublicUrl(SHOP_IMAGES_BUCKET, fileKey);
    }

    // Prepare DynamoDB item
    const item = {
      shop_id: { S: shop_id }
    };

    // Only add isEnabled if provided and non-empty
    if (isEnabled !== undefined && isEnabled !== null && String(isEnabled).trim() !== "") {
      item.isEnabled = { S: String(isEnabled).trim() };
    }

    // Only add rewardChances if provided and non-empty
    if (rewardChances !== undefined && rewardChances !== null && String(rewardChances).trim() !== "") {
      item.rewardChances = { S: String(rewardChances).trim() };
    }

    // Only add cardImage if it was uploaded
    if (cardImageUrl) {
      item.cardImage = { S: cardImageUrl };
    }

    const params = {
      TableName: "qr_configuration",
      Item: item
    };

    await client.send(new PutItemCommand(params));
    
    res.status(201).json(createSuccessResponse("QR code configuration saved successfully", {
      shop_id: shop_id,
      isEnabled: (isEnabled !== undefined && isEnabled !== null && String(isEnabled).trim() !== "") ? String(isEnabled).trim() : null,
      rewardChances: (rewardChances !== undefined && rewardChances !== null && String(rewardChances).trim() !== "") ? String(rewardChances).trim() : null,
      cardImage: cardImageUrl || null
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error saving QR code configuration:", error);
    throw createDatabaseError("save QR code configuration", error, "exports.PostQRCodeConfiguration");
  }
});

// Get QR Code Configuration
export const GetQRCodeConfiguration = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Cookie 'userDataHTTP' not found");
  }
  
  let shop_id;
  try {
    shop_id = JSON.parse(cookie).shop_id;
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  try {
    const params = {
      TableName: "qr_configuration",
      Key: {
        shop_id: { S: shop_id }
      }
    };

    const { Item } = await client.send(new GetItemCommand(params));

    const isEdit = !["pending", "scheduled_released_cancelled", "approved_scheduled"].includes(req.releaseStatus);
    const releaseStatus = req.releaseStatus || null;

    if (!Item) {
      res.status(200).json(createSuccessResponse("No QR code configuration found for this shop", { isEdit, releaseStatus }));
      return;
    }

    // Clean the response data
    let cleanedData = {};
    for (let key in Item) {
      if (typeof Item[key] === "object" && Item[key].S !== undefined) {
        cleanedData[key] = Item[key].S;
      } else if (typeof Item[key] === "object" && Item[key].BOOL !== undefined) {
        cleanedData[key] = Item[key].BOOL;
      } else {
        cleanedData[key] = Item[key];
      }
    }

    cleanedData.isEdit = isEdit;
    cleanedData.releaseStatus = releaseStatus;

    // Generate presigned URL for cardImage if it exists
    if (cleanedData.cardImage) {
      try {
        let imageKey = cleanedData.cardImage;
        
        // Extract key from full URL if needed
        if (imageKey.startsWith('https://')) {
          const urlParts = imageKey.split('.amazonaws.com/');
          imageKey = urlParts.length > 1 ? urlParts[1] : imageKey;
        }
        
        const imageCommand = new GetObjectCommand({
          Bucket: 'collbine-forbusiness-shop-images',
          Key: imageKey
        });
        const imageUrl = await getSignedUrl(getS3(), imageCommand, { expiresIn: 3600 });
        cleanedData.cardImage_signedUrl = imageUrl;
      } catch (urlError) {
        console.error("Error generating presigned URL for cardImage:", urlError);
        // Continue without presigned URL
      }
    }

    res.status(200).json(createSuccessResponse("QR code configuration retrieved successfully", cleanedData));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error retrieving QR code configuration:", error);
    throw createDatabaseError("retrieve QR code configuration", error, "exports.GetQRCodeConfiguration");
  }
});

// Get redemption code details by redemption_id
export const getRedemptionCodeById = asyncHandler(async (req, res, next) => {
  const { redemption_id } = req.query || {};

  if (!redemption_id || String(redemption_id).trim() === "") {
    throw createValidationError("redemption_id is required");
  }

  try {
    const params = {
      TableName: "redemption_code",
      Key: {
        redemption_id: { S: String(redemption_id).trim() },
      },
    };

    const { Item } = await client.send(new GetItemCommand(params));

    if (!Item) {
      res.status(200).json(createSuccessResponse("No redemption code found", null));
      return;
    }

    const cleanedData = unmarshall(Item);
    res.status(200).json(createSuccessResponse("Redemption code retrieved successfully", cleanedData));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error retrieving redemption code:", error);
    throw createDatabaseError("retrieve redemption code", error, "exports.getRedemptionCodeById");
  }
});

// Store "Contact Us" form submission
export const postQuery = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, message } = req.body || {};

  if (!firstName || !lastName || !email || !message) {
    throw createValidationError("firstName, lastName, email, and message are required");
  }

  const query_id = uuidv4();

  const Item = {
    query_id: { S: query_id },
    firstName: { S: String(firstName).trim() },
    lastName: { S: String(lastName).trim() },
    email: { S: String(email).trim().toLowerCase() },
    message: { S: String(message).trim() },
    createdAt: { S: new Date().toISOString() },
  };

  const params = {
    TableName: "query",
    Item,
  };

  try {
    await client.send(new PutItemCommand(params));
    res.status(200).json(
      createSuccessResponse("Contact Us submitted successfully", { query_id })
    );
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error submitting query:", error);
    throw new AppError(
      "Database operation failed: store query",
      ERROR_TYPES.DATABASE_ERROR,
      500,
      error?.message || "Unknown DynamoDB error"
    );
  }
});

// Update QR Code Configuration
export const UpdateQRCodeConfiguration = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Cookie 'userDataHTTP' not found");
  }
  
  let shop_id;
  try {
    shop_id = JSON.parse(cookie).shop_id;
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  const { isEnabled, rewardChances } = req.body;

  let cardImageUrl = "";

  try {
    // Handle cardImage file upload if provided (replace existing image)
    if (req.file) {
      const file = req.file;
      const fileKey = `${shop_id}_qr_card_image`;

      const uploadParams = {
        Bucket: "collbine-forbusiness-shop-images",
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      await s3.send(new PutObjectCommand(uploadParams));

      cardImageUrl = s3PublicUrl(SHOP_IMAGES_BUCKET, fileKey);
    }

    // Ensure at least one field is provided
    const hasIsEnabled = isEnabled !== undefined && isEnabled !== null && String(isEnabled).trim() !== "";
    const hasRewardChances = rewardChances !== undefined && rewardChances !== null && String(rewardChances).trim() !== "";
    const hasCardImage = !!cardImageUrl;

    if (!hasIsEnabled && !hasRewardChances && !hasCardImage) {
      throw createValidationError("At least one field (isEnabled, rewardChances, cardImage) must be provided for update");
    }

    let updateExpression = "SET ";
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    const setParts = [];
    let index = 0;

    if (hasIsEnabled) {
      const namePlaceholder = "#isEnabled";
      const valuePlaceholder = `:val${index++}`;
      setParts.push(`${namePlaceholder} = ${valuePlaceholder}`);
      expressionAttributeNames[namePlaceholder] = "isEnabled";
      expressionAttributeValues[valuePlaceholder] = { S: String(isEnabled).trim() };
    }

    if (hasRewardChances) {
      const namePlaceholder = "#rewardChances";
      const valuePlaceholder = `:val${index++}`;
      setParts.push(`${namePlaceholder} = ${valuePlaceholder}`);
      expressionAttributeNames[namePlaceholder] = "rewardChances";
      expressionAttributeValues[valuePlaceholder] = { S: String(rewardChances).trim() };
    }

    if (hasCardImage) {
      const namePlaceholder = "#cardImage";
      const valuePlaceholder = `:val${index++}`;
      setParts.push(`${namePlaceholder} = ${valuePlaceholder}`);
      expressionAttributeNames[namePlaceholder] = "cardImage";
      expressionAttributeValues[valuePlaceholder] = { S: cardImageUrl };
    }

    updateExpression += setParts.join(", ");

    const params = {
      TableName: "qr_configuration",
      Key: {
        shop_id: { S: shop_id }
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW"
    };

    const { Attributes } = await client.send(new UpdateItemCommand(params));

    // Clean the response data
    let cleanedData = {};
    if (Attributes) {
      for (let key in Attributes) {
        if (typeof Attributes[key] === "object" && Attributes[key].S !== undefined) {
          cleanedData[key] = Attributes[key].S;
        } else if (typeof Attributes[key] === "object" && Attributes[key].BOOL !== undefined) {
          cleanedData[key] = Attributes[key].BOOL;
        } else {
          cleanedData[key] = Attributes[key];
        }
      }
    }

    res.status(200).json(createSuccessResponse("QR code configuration updated successfully", cleanedData));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error updating QR code configuration:", error);
    throw createDatabaseError("update QR code configuration", error, "exports.UpdateQRCodeConfiguration");
  }
});

export const getDataForBusiness = asyncHandler(async (req, res, next) => {
  const cookiedata = req.cookies.userDataHTTP;
  
  // Ensure cookie exists and parse it
  if (!cookiedata) {
    throw createValidationError("Cookie 'userDataHTTP' not found");
  }
  
  let userData;
  try {
    userData = JSON.parse(cookiedata).shop_id;
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  // Log the shop_id (previously referred to as UEN)
  console.log("Querying for shop_id:", userData);

  // DynamoDB GetItem parameters
  const params = {
    TableName: "businessinformations",
    Key: {
      shop_id: {S: userData}
    },
  };

  try {
    const command = new GetItemCommand(params);
    const { Item } = await client.send(command);

    // Check if Item is undefined or null
    if (!Item) {
      res.status(200).json(createSuccessResponse("No business information found", null));
      return;
    }
    
    let cleanedData = {};
for (let key in Item) {
    if (typeof Item[key] === "object" && Item[key].S !== undefined) {
        cleanedData[key] = Item[key].S; // Keeps empty strings as they are
    } else {
        cleanedData[key] = Item[key];
    }
}
    
    // Log the Item to inspect the response from DynamoDB
    console.log("DynamoDB response:", cleanedData);

    // Add isEdit and releaseStatus as additional information based on release status (set by checkReleaseStatus middleware)
    cleanedData.isEdit = !["pending", "scheduled_released_cancelled", "approved_scheduled"].includes(req.releaseStatus);
    cleanedData.releaseStatus = req.releaseStatus || null;

    // Return the response with the fetched item
    res.status(200).json(createSuccessResponse("Business data retrieved successfully", cleanedData));
  } catch (error) {
    if (error instanceof AppError) {
      throw error; // Re-throw AppError instances
    }
    throw createDatabaseError("get business data", error, "exports.getDataForBusiness");
  }
});

// Check if an entry for shop_id (from cookie) exists in Supabase live_shop_details
export const checkLiveShopDetailsExists = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }
  const shop_id = userData.shop_id;
  if (!shop_id) {
    throw createValidationError("shop_id not found in cookie");
  }
  if (!supabase) {
    return res.status(200).json(createSuccessResponse("Live shop details existence checked", { isShopLive: false }));
  }
  try {
    const { data, error } = await supabase
      .from('live_shop_details')
      .select('shop_id')
      .eq('shop_id', shop_id)
      .maybeSingle();
    if (error) {
      console.error("Error checking live_shop_details:", error);
      throw createDatabaseError("check live_shop_details", error, "exports.checkLiveShopDetailsExists");
    }
    const isShopLive = data != null;
    res.status(200).json(createSuccessResponse("Live shop details existence checked", { isShopLive }));
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw createDatabaseError("check live_shop_details", error, "exports.checkLiveShopDetailsExists");
  }
});

// Delete the row for this shop from Supabase live_shop_details
export const deleteLiveShopDetails = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }
  const shop_id = userData.shop_id;
  if (!shop_id) {
    throw createValidationError("shop_id not found in cookie");
  }
  if (!supabase) {
    throw createExternalServiceError("Supabase", "delete live_shop_details", new Error("Supabase client not configured"), "exports.deleteLiveShopDetails");
  }
  const { error } = await supabase
    .from('live_shop_details')
    .delete()
    .eq('shop_id', shop_id);
  if (error) {
    console.error("Error deleting from live_shop_details:", error);
    throw createDatabaseError("delete live_shop_details", error, "exports.deleteLiveShopDetails");
  }
  res.status(200).json(createSuccessResponse("Live shop details deleted", { shop_id }));
});

export const updateBusinessInformation = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  // Get the fields to update from request body
  const updateFields = req.body;
  
  // Validate that at least one field is provided
  if (!updateFields || Object.keys(updateFields).length === 0) {
    throw createValidationError("At least one field must be provided for update");
  }

  // Define allowed fields (used for validation and update expression)
  const allowedFields = [
    'businessName', 'uen', 'addressUnitNumber', 'addressBuildingName', 
    'addressStreetAddress', 'addressPostalCode', 'isBusinessDetailApproved'
  ];

  // Handle nested address structure (like POST endpoint)
  if (updateFields.address && typeof updateFields.address === 'object') {
    if (updateFields.address.unitNumber !== undefined) {
      updateFields.addressUnitNumber = updateFields.address.unitNumber;
    }
    if (updateFields.address.buildingName !== undefined) {
      updateFields.addressBuildingName = updateFields.address.buildingName;
    }
    if (updateFields.address.streetAddress !== undefined) {
      updateFields.addressStreetAddress = updateFields.address.streetAddress;
    }
    if (updateFields.address.postalCode !== undefined) {
      updateFields.addressPostalCode = updateFields.address.postalCode;
    }
    // Remove the nested address object to avoid confusion
    delete updateFields.address;
  }

  // Handle field name mismatch: isBusinessDetailsApproved (body) -> isBusinessDetailApproved (DB)
  if (updateFields.isBusinessDetailsApproved !== undefined) {
    updateFields.isBusinessDetailApproved = updateFields.isBusinessDetailsApproved;
    delete updateFields.isBusinessDetailsApproved;
  }

  // Validate that at least one valid field is provided (after flattening address)
  const hasValidField = Object.keys(updateFields).some(field => allowedFields.includes(field));
  if (!hasValidField) {
    throw createValidationError("At least one valid field must be provided for update");
  }

  console.log("📝 Business update fields:", updateFields);

  // First, get the existing record to check all 6 required fields
  let existingRecord;
  try {
    const getParams = {
      TableName: "businessinformations",
      Key: {
        shop_id: { S: userData.shop_id }
      }
    };
    const getResult = await client.send(new GetItemCommand(getParams));
    if (!getResult.Item) {
      throw createNotFoundError("Business information");
    }
    existingRecord = unmarshall(getResult.Item);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw createDatabaseError("fetch existing business information", error, "exports.updateBusinessInformation");
  }

  // Build the update expression dynamically
  let updateExpression = "SET ";
  let expressionAttributeNames = {};
  let expressionAttributeValues = {};
  
  let setParts = [];
  let index = 0;

  // Handle text fields
  Object.keys(updateFields).forEach((field) => {
    if (allowedFields.includes(field)) {
      const placeholder = `:val${index}`;
      const namePlaceholder = `#${field}`;
      
      setParts.push(`#${field} = ${placeholder}`);
      expressionAttributeNames[namePlaceholder] = field;
      expressionAttributeValues[placeholder] = { S: updateFields[field] };
      index++;
    }
  });
  
  if (setParts.length === 0) {
    throw createValidationError("No valid fields provided for update");
  }
  
  updateExpression += setParts.join(", ");

  const params = {
    TableName: "businessinformations",
    Key: {
      shop_id: { S: userData.shop_id }
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW"
  };

  try {
    const result = await client.send(new UpdateItemCommand(params));
    
    // Use the returned Attributes from the update instead of fetching
    if (result.Attributes) {
      const businessData = unmarshall(result.Attributes);
      
      // Check if all 5 required fields are not empty (building name is optional)
      const requiredFields = [
        businessData.businessName,
        businessData.uen,
        businessData.addressUnitNumber,
        businessData.addressStreetAddress,
        businessData.addressPostalCode
      ];
      
      const hasAllRequiredField = requiredFields.every(field => 
        field !== undefined && field !== null && String(field).trim() !== ""
      );
      
      // Update hasAllRequiredField (also with ReturnValues: "ALL_NEW" to get final result)
      const updateHasAllParams = {
        TableName: "businessinformations",
        Key: {
          shop_id: { S: userData.shop_id }
        },
        UpdateExpression: "SET hasAllRequiredField = :hasAllRequired",
        ExpressionAttributeValues: {
          ":hasAllRequired": { BOOL: hasAllRequiredField }
        },
        ReturnValues: "ALL_NEW"
      };
      
      const finalResult = await client.send(new UpdateItemCommand(updateHasAllParams));
      
      // Clean the returned data from the second update
      let cleanedData = {};
      if (finalResult.Attributes) {
        cleanedData = unmarshall(finalResult.Attributes);
      } else {
        // Fallback to first result if second update doesn't return attributes
        cleanedData = businessData;
        cleanedData.hasAllRequiredField = hasAllRequiredField;
      }
    
      res.status(200).json(createSuccessResponse("Business information updated successfully", cleanedData));
    } else {
      // Edge case: if first update doesn't return attributes, fetch once
      const getParams = {
        TableName: "businessinformations",
        Key: {
          shop_id: { S: userData.shop_id }
        }
      };
      const getResult = await client.send(new GetItemCommand(getParams));
      
      if (getResult.Item) {
        const businessData = unmarshall(getResult.Item);
        
        const requiredFields = [
          businessData.businessName,
          businessData.uen,
          businessData.addressUnitNumber,
          businessData.addressStreetAddress,
          businessData.addressPostalCode
        ];
        
        const hasAllRequiredField = requiredFields.every(field => 
          field !== undefined && field !== null && String(field).trim() !== ""
        );
        
        const updateHasAllParams = {
          TableName: "businessinformations",
          Key: {
            shop_id: { S: userData.shop_id }
          },
          UpdateExpression: "SET hasAllRequiredField = :hasAllRequired",
          ExpressionAttributeValues: {
            ":hasAllRequired": { BOOL: hasAllRequiredField }
          },
          ReturnValues: "ALL_NEW"
        };
        
        const finalResult = await client.send(new UpdateItemCommand(updateHasAllParams));
        const cleanedData = finalResult.Attributes ? unmarshall(finalResult.Attributes) : businessData;
        
        res.status(200).json(createSuccessResponse("Business information updated successfully", cleanedData));
      }
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error updating business information:", error);
    throw createDatabaseError("update business information", error, "exports.updateBusinessInformation");
  }
});

export const PostStampManagementData = asyncHandler(async (req, res, next) => {
  const shop_id = req.cookies.userDataHTTP;  
  
  if (!shop_id) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(shop_id).shop_id;
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  const { cardTitle, cardDescription, numberOfStamps, expirationType, numberOfDaysToExpire, cardStepDetails, termsAndConditions, isEnabled } = req.body;
  
  // Set isEnabled default to true if not provided
  const isEnabledValue = isEnabled !== undefined && isEnabled !== null ? String(isEnabled) : "true";
  
  // Check if at least one field is provided
  const hasTextFields = cardTitle || cardDescription || numberOfStamps || expirationType || numberOfDaysToExpire || cardStepDetails || termsAndConditions;
  const hasFileUploads = req.files && (req.files.defaultStampedIcon || req.files.defaultUnStampedIcon);
  
  if (!hasTextFields && !hasFileUploads) {
    throw createValidationError("At least one field must be provided");
  }
  
  // Parse cardStepDetails only if provided
  let cardStepDetailsValid = false;
  let parsedCardStepDetails;
  let cardStepDetailsString = null;
  
  if (cardStepDetails) {
    try {
      // Handle both cases: already parsed array/object (from bodyParser) or JSON string
      if (Array.isArray(cardStepDetails)) {
        parsedCardStepDetails = cardStepDetails;
      } else if (typeof cardStepDetails === 'string') {
        parsedCardStepDetails = JSON.parse(cardStepDetails);
      } else if (typeof cardStepDetails === 'object') {
        parsedCardStepDetails = cardStepDetails;
      } else {
        throw createValidationError("cardStepDetails must be a valid JSON array");
      }
      
    if (!Array.isArray(parsedCardStepDetails)) {
      throw createValidationError("cardStepDetails must be a valid JSON array");
    }
    // Check if any dictionary in the array has a key named "reward"
    cardStepDetailsValid = parsedCardStepDetails.some(item => 
      item && typeof item === 'object' && item.hasOwnProperty('reward')
    );
      
      // Convert to string for storage in DynamoDB
      cardStepDetailsString = typeof cardStepDetails === 'string' 
        ? cardStepDetails 
        : JSON.stringify(parsedCardStepDetails);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw createValidationError("Invalid cardStepDetails JSON format");
    }
  }
  
  // Check if all 3 required fields are not empty (for hasAllRequiredField flag)
  const requiredFields = [
    numberOfStamps,
    expirationType,
    cardStepDetails
  ];
  
  const hasAllRequiredField = requiredFields[0] !== undefined && requiredFields[0] !== null && String(requiredFields[0]).trim() !== "" &&
                              requiredFields[1] !== undefined && requiredFields[1] !== null && String(requiredFields[1]).trim() !== "" &&
                              cardStepDetailsValid;

  try {
    let defaultStampedIcon = "";
    let defaultUnStampedIcon = "";

    // List of possible file fields
    const fileFields = ["defaultStampedIcon", "defaultUnStampedIcon"];

    for (const fieldName of fileFields) {
      if (req.files && req.files[fieldName]) {
        const file = req.files[fieldName][0];

        // Generate a unique file key
        const fileKey = `${userData}_${fieldName}`;

        const uploadParams = {
          Bucket: "collbine-forbusiness-shop-images",
          Key: fileKey,
          Body: file.buffer, // Directly use the buffer for in-memory storage
          ContentType: file.mimetype,
        };

        // Upload to S3
        await s3.send(new PutObjectCommand(uploadParams));

        // Construct the file URL
        const fileUrl = s3PublicUrl(SHOP_IMAGES_BUCKET, fileKey);

        // Assign URL to the respective field, otherwise keep an empty string
        if (fieldName === "defaultStampedIcon") {
          defaultStampedIcon = fileUrl;
        } else if (fieldName === "defaultUnStampedIcon") {
          defaultUnStampedIcon = fileUrl;
        }
      }
    }

    // Build item with only provided fields
    const item = {
      shop_id: { S: userData }
    };
    
    // Only add fields that are provided
    if (cardTitle) item.cardTitle = { S: cardTitle };
    if (cardDescription) item.cardDescription = { S: cardDescription };
    if (numberOfStamps) item.numberOfStamps = { S: numberOfStamps };
    if (expirationType) item.expirationType = { S: expirationType };
    if (numberOfDaysToExpire) item.numberOfDaysToExpire = { S: numberOfDaysToExpire };
    if (cardStepDetailsString) item.cardStepDetails = { S: cardStepDetailsString };
    if (termsAndConditions) item.termsAndConditions = { S: termsAndConditions };
    if (defaultStampedIcon) item.defaultStampedIcon = { S: defaultStampedIcon };
    if (defaultUnStampedIcon) item.defaultUnStampedIcon = { S: defaultUnStampedIcon };
    
    // Always add isEnabled (defaults to "true" if not provided)
    item.isEnabled = { S: isEnabledValue };
    
    // Set hasAllRequiredField based on provided fields
    item.hasAllRequiredField = { BOOL: hasAllRequiredField };

    const params = {
      TableName: "StampData",
      Item: item
    };

        await client.send(new PutItemCommand(params));
    res.status(200).json(createSuccessResponse("Stamp management data stored successfully"));
      } catch (error) {
    if (error instanceof AppError) {
      throw error;
      }
    console.error("Error storing stamp management data:", error);
    throw createDatabaseError("store stamp management data", error, "exports.PostStampManagementData");
  }
});




export const UploadImage = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  const currentIndex = req.body.currentIndex;

  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }

  let shop_id;
  try {
    shop_id = JSON.parse(cookie).shop_id;
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  const imageName = req.body.imageName;

  // Ensure files exist
  if (!req.files || (!req.files['stampedIcon'] && !req.files['unstampedIcon'])) {
    throw createValidationError("No files uploaded");
  }
  console.log("Uploaded Files:", req.files);

  // Prepare S3 upload function
  const uploadToS3 = async (file, fileName) => {
    const params = {
      Bucket: 'collbine-forbusiness-shop-images', // Your S3 bucket
      Key: `${shop_id}/${fileName}_${currentIndex}`, // Added _${currentIndex}
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    try {
      const command = new PutObjectCommand(params);
      await s3.send(command);
      return s3PublicUrl(SHOP_IMAGES_BUCKET, params.Key);
    } catch (error) {
      console.error(`Error uploading ${fileName} to S3:`, error);
      throw new Error('Error uploading to S3');
    }
  };

  try {
    const uploadedFiles = {};

    // Upload stampedIcon if present
    if (req.files['stampedIcon']) {
      uploadedFiles.stampedIconUrl = await uploadToS3(req.files['stampedIcon'][0], `stampedIcon`);
    }

    // Upload unstampedIcon if present
    if (req.files['unstampedIcon']) {
      uploadedFiles.unstampedIconUrl = await uploadToS3(req.files['unstampedIcon'][0], `unstampedIcon`);
    }

    // Return the response with both URLs (if they were uploaded)
    res.status(200).json(createSuccessResponse("Images uploaded successfully", uploadedFiles));
  } catch (uploadError) {
    if (uploadError instanceof AppError) {
      throw uploadError;
  }
    console.error("Error uploading images:", uploadError);
    throw createExternalServiceError("AWS S3", "upload images", uploadError, "exports.UploadImage");
  }
});



export const GetStampManagementData = asyncHandler(async (req, res, next) => {
  const shop_id = req.cookies.userDataHTTP;
  
  if (!shop_id) {
    throw createValidationError("Missing userDataHTTP cookie");
  }

  let userData;
  try {
    userData = JSON.parse(shop_id);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  try {
    const params = {
      TableName: 'StampData',
      Key: {
        shop_id: { S: userData.shop_id }
      }
    };

    const { Item } = await client.send(new GetItemCommand(params));

    if (!Item) {
      res.status(200).json(createSuccessResponse("No data found for this shop_id", null));
      return;
    }

    // Data cleaning logic
    let cleanedData = {};
    for (let key in Item) {
      if (typeof Item[key] === "object" && Item[key].S !== undefined) {
        cleanedData[key] = Item[key].S;
      } else {
        cleanedData[key] = Item[key];
      }
    }

    let listOfImages = [];

    if (cleanedData.defaultUnStampedIcon && cleanedData.defaultUnStampedIcon.length != 0) {
    listOfImages.push("defaultUnStampedIcon");
}

    if (cleanedData.defaultStampedIcon && cleanedData.defaultStampedIcon.length != 0) {
    listOfImages.push("defaultStampedIcon");
}

    try {
      const urls = await generatePresignedUrls(listOfImages, userData.shop_id);
      console.log("list of Images", listOfImages);
      
    let defaultUnStampedUrl = "";
    let defaultStampedUrl = "";

    urls.forEach(image => {
      if (image.imageName === "defaultUnStampedIcon") {
        defaultUnStampedUrl = image.signedUrl;
      } else if (image.imageName === "defaultStampedIcon") {
        defaultStampedUrl = image.signedUrl;
      }
    });
      
      cleanedData['defaultUnStampedUrl_Presign'] = defaultUnStampedUrl;
      cleanedData['defaultStampedUrl_Presign'] = defaultStampedUrl;
    } catch (urlError) {
      console.error("Error generating presigned URLs:", urlError);
      // Continue without presigned URLs
    }

    // Add isEdit and releaseStatus as additional information based on release status (set by checkReleaseStatus middleware)
    cleanedData.isEdit = !["pending", "scheduled_released_cancelled", "approved_scheduled"].includes(req.releaseStatus);
    cleanedData.releaseStatus = req.releaseStatus || null;

    res.status(200).json(createSuccessResponse("Data retrieved and cleaned successfully", cleanedData));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error retrieving data:", error);
    throw createDatabaseError("retrieve stamp management data", error, "exports.GetStampManagementData");
  }
});

export const updateStampManagementData = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  const updateFields = req.body;
  
  // Check for image deletion flags
  const isDefaultStampedIconDeleted = updateFields.isDefaultStampedIconDeleted === 'true';
  const isDefaultUnStampedIconDeleted = updateFields.isDefaultUnStampedIconDeleted === 'true';
  
  const hasTextFields = updateFields && Object.keys(updateFields).length > 0;
  const hasFileUploads = req.files && Object.keys(req.files).length > 0;
  const hasImageDeletions = isDefaultStampedIconDeleted || isDefaultUnStampedIconDeleted;
  
  if (!hasTextFields && !hasFileUploads && !hasImageDeletions) {
    throw createValidationError("At least one field must be provided for update");
  }

  let defaultStampedIcon = "";
  let defaultUnStampedIcon = "";

  console.log("📁 Files received:", req.files);
  console.log("📝 Body received:", req.body);

  try {
    if (req.files) {
      const fileFields = ["defaultStampedIcon", "defaultUnStampedIcon"];

      for (const fieldName of fileFields) {
        if (req.files[fieldName]) {
          const file = req.files[fieldName][0];
          const fileKey = `${userData.shop_id}_${fieldName}`;

          const uploadParams = {
            Bucket: "collbine-forbusiness-shop-images",
            Key: fileKey,
            Body: file.buffer,
            ContentType: file.mimetype,
          };

          await s3.send(new PutObjectCommand(uploadParams));
          const fileUrl = s3PublicUrl(SHOP_IMAGES_BUCKET, fileKey);

          if (fieldName === "defaultStampedIcon") {
            defaultStampedIcon = fileUrl;
          } else if (fieldName === "defaultUnStampedIcon") {
            defaultUnStampedIcon = fileUrl;
          }
        }
      }
    }

    let updateExpression = "SET ";
    let expressionAttributeNames = {};
    let expressionAttributeValues = {};
    
    const allowedFields = [
      'cardTitle', 'cardDescription', 'numberOfStamps', 'expirationType', 
      'numberOfDaysToExpire', 'cardStepDetails', 'termsAndConditions', 'isEnabled'
    ];
    
    let setParts = [];
    let index = 0;

    Object.keys(updateFields).forEach((field) => {
      if (allowedFields.includes(field)) {
        const placeholder = `:val${index}`;
        const namePlaceholder = `#${field}`;
        
        setParts.push(`#${field} = ${placeholder}`);
        expressionAttributeNames[namePlaceholder] = field;
        expressionAttributeValues[placeholder] = { S: updateFields[field] };
        index++;
      }
    });

    // Handle defaultStampedIcon updates and deletions
    if (defaultStampedIcon) {
      const placeholder = `:val${index}`;
      setParts.push(`#defaultStampedIcon = ${placeholder}`);
      expressionAttributeNames['#defaultStampedIcon'] = 'defaultStampedIcon';
      expressionAttributeValues[placeholder] = { S: defaultStampedIcon };
      index++;
    } else if (isDefaultStampedIconDeleted) {
      // User wants to delete defaultStampedIcon - delete from S3 and set to empty
      try {
        const stampedIconKey = `${userData.shop_id}_defaultStampedIcon`;
        await s3.send(new DeleteObjectCommand({
          Bucket: "collbine-forbusiness-shop-images",
          Key: stampedIconKey
        }));
        console.log(`🗑️ Deleted defaultStampedIcon from S3: ${stampedIconKey}`);
      } catch (s3Error) {
        console.error("Error deleting defaultStampedIcon from S3:", s3Error);
        // Continue with database update even if S3 deletion fails
      }
      
      setParts.push(`#defaultStampedIcon = :emptyString`);
      expressionAttributeNames['#defaultStampedIcon'] = 'defaultStampedIcon';
      expressionAttributeValues[':emptyString'] = { S: "" };
    }

    // Handle defaultUnStampedIcon updates and deletions
    if (defaultUnStampedIcon) {
      const placeholder = `:val${index}`;
      setParts.push(`#defaultUnStampedIcon = ${placeholder}`);
      expressionAttributeNames['#defaultUnStampedIcon'] = 'defaultUnStampedIcon';
      expressionAttributeValues[placeholder] = { S: defaultUnStampedIcon };
      index++;
    } else if (isDefaultUnStampedIconDeleted) {
      // User wants to delete defaultUnStampedIcon - delete from S3 and set to empty
      try {
        const unstampedIconKey = `${userData.shop_id}_defaultUnStampedIcon`;
        await s3.send(new DeleteObjectCommand({
          Bucket: "collbine-forbusiness-shop-images",
          Key: unstampedIconKey
        }));
        console.log(`🗑️ Deleted defaultUnStampedIcon from S3: ${unstampedIconKey}`);
      } catch (s3Error) {
        console.error("Error deleting defaultUnStampedIcon from S3:", s3Error);
        // Continue with database update even if S3 deletion fails
      }
      
      setParts.push(`#defaultUnStampedIcon = :emptyString`);
      expressionAttributeNames['#defaultUnStampedIcon'] = 'defaultUnStampedIcon';
      expressionAttributeValues[':emptyString'] = { S: "" };
    }
    
    if (setParts.length === 0) {
      throw createValidationError("No valid fields provided for update");
    }
    
    updateExpression += setParts.join(", ");

    const params = {
      TableName: "StampData",
      Key: {
        shop_id: { S: userData.shop_id }
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW"
    };

    const result = await client.send(new UpdateItemCommand(params));
    
    // Use the returned Attributes from the update to check all 2 required fields
    if (result.Attributes) {
      const stampData = unmarshall(result.Attributes);
      
      // Check if all 3 required fields are not empty
      // For cardStepDetails, also check if at least one item has "reward" key
      let cardStepDetailsValid = false;
      try {
        const cardStepDetailsStr = stampData.cardStepDetails;
        if (!cardStepDetailsStr) {
          cardStepDetailsValid = false;
        } else {
          const parsedCardStepDetails = typeof cardStepDetailsStr === 'string' 
            ? JSON.parse(cardStepDetailsStr) 
            : cardStepDetailsStr;
          
          if (!Array.isArray(parsedCardStepDetails)) {
            cardStepDetailsValid = false;
          } else {
            // Check if any dictionary in the array has a key named "reward"
            cardStepDetailsValid = parsedCardStepDetails.some(item => 
              item && typeof item === 'object' && item.hasOwnProperty('reward')
            );
          }
        }
      } catch (error) {
        // Invalid JSON format - treat as invalid but don't throw (data already in DB)
        cardStepDetailsValid = false;
      }
      
      const requiredFields = [
        stampData.numberOfStamps,
        stampData.expirationType,
        stampData.cardStepDetails
      ];
      
      const hasAllRequiredField = requiredFields[0] !== undefined && requiredFields[0] !== null && String(requiredFields[0]).trim() !== "" &&
                                  requiredFields[1] !== undefined && requiredFields[1] !== null && String(requiredFields[1]).trim() !== "" &&
                                  cardStepDetailsValid;
      
      // Update hasAllRequiredField (also with ReturnValues: "ALL_NEW" to get final result)
      const updateHasAllParams = {
        TableName: "StampData",
        Key: {
          shop_id: { S: userData.shop_id }
        },
        UpdateExpression: "SET hasAllRequiredField = :hasAllRequired",
        ExpressionAttributeValues: {
          ":hasAllRequired": { BOOL: hasAllRequiredField }
        },
        ReturnValues: "ALL_NEW"
      };
      
      const finalResult = await client.send(new UpdateItemCommand(updateHasAllParams));
      
      // Clean the returned data from the second update
      let cleanedData = {};
      if (finalResult.Attributes) {
        cleanedData = unmarshall(finalResult.Attributes);
      } else {
        // Fallback to first result if second update doesn't return attributes
        cleanedData = stampData;
        cleanedData.hasAllRequiredField = hasAllRequiredField;
      }
    
      res.status(200).json(createSuccessResponse("Stamp management data updated successfully", cleanedData));
    } else {
      // Edge case: if first update doesn't return attributes, fetch once
      const getParams = {
        TableName: "StampData",
        Key: {
          shop_id: { S: userData.shop_id }
        }
      };
      const getResult = await client.send(new GetItemCommand(getParams));
      
      if (getResult.Item) {
        const stampData = unmarshall(getResult.Item);
        
        // Check if all 3 required fields are not empty
        let cardStepDetailsValid = false;
        try {
          const cardStepDetailsStr = stampData.cardStepDetails;
          if (!cardStepDetailsStr) {
            cardStepDetailsValid = false;
          } else {
            const parsedCardStepDetails = typeof cardStepDetailsStr === 'string' 
              ? JSON.parse(cardStepDetailsStr) 
              : cardStepDetailsStr;
            
            if (!Array.isArray(parsedCardStepDetails)) {
              cardStepDetailsValid = false;
            } else {
              cardStepDetailsValid = parsedCardStepDetails.some(item => 
                item && typeof item === 'object' && item.hasOwnProperty('reward')
              );
            }
          }
        } catch (error) {
          // Invalid JSON format - treat as invalid but don't throw (data already in DB)
          cardStepDetailsValid = false;
        }
        
        const requiredFields = [
          stampData.numberOfStamps,
          stampData.expirationType,
          stampData.cardStepDetails
        ];
        
        const hasAllRequiredField = requiredFields[0] !== undefined && requiredFields[0] !== null && String(requiredFields[0]).trim() !== "" &&
                                    requiredFields[1] !== undefined && requiredFields[1] !== null && String(requiredFields[1]).trim() !== "" &&
                                    cardStepDetailsValid;
        
        const updateHasAllParams = {
          TableName: "StampData",
          Key: {
            shop_id: { S: userData.shop_id }
          },
          UpdateExpression: "SET hasAllRequiredField = :hasAllRequired",
          ExpressionAttributeValues: {
            ":hasAllRequired": { BOOL: hasAllRequiredField }
          },
          ReturnValues: "ALL_NEW"
        };
        
        const finalResult = await client.send(new UpdateItemCommand(updateHasAllParams));
        const cleanedData = finalResult.Attributes ? unmarshall(finalResult.Attributes) : stampData;
        
        res.status(200).json(createSuccessResponse("Stamp management data updated successfully", cleanedData));
      }
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error updating stamp management:", error);
    throw createDatabaseError("update stamp management data", error, "exports.updateStampManagementData");
  }
});



export const GetCustomerDetails = asyncHandler(async (req, res, next) => {
  const shop_id = req.cookies.userDataHTTP;
  
  if (!shop_id) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(shop_id);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  try {
    const params = {
      TableName: 'CustomerFacingDetails',
      Key: {
        shop_id: { S: userData.shop_id }
      }
    };

    const { Item } = await client.send(new GetItemCommand(params));

    if (!Item) {
      res.status(200).json(createSuccessResponse("No data found for this shop_id", null));
      return;
    }
    
    const cleanedData = unmarshall(Item);
    if (!cleanedData.location && Array.isArray(cleanedData.locations) && cleanedData.locations.length > 0) {
      cleanedData.location = cleanedData.locations[0];
    }
    if (cleanedData.locations !== undefined) {
      delete cleanedData.locations;
    }
    let listOfImages = [];

    if (cleanedData.banner && cleanedData.banner.length != 0) {
      listOfImages.push("banner");
    }

    if (cleanedData.thumbnail && cleanedData.thumbnail.length != 0) {
      listOfImages.push("thumbnail");
    }

    // Always return these fields so the client can represent a missing image
    // without accidentally passing undefined to next/image.
    cleanedData.banner_signedUrl = "";
    cleanedData.thumbnail_signedUrl = "";
    
    try {
      const urls = await generatePresignedUrls(listOfImages, userData.shop_id);

      let banner = "";
      let thumbnail = "";

      urls.forEach(image => {
        if (image.imageName === "banner") {
          banner = image.signedUrl;
        } else if (image.imageName === "thumbnail") {
          thumbnail = image.signedUrl;
        }
      });

      cleanedData['banner_signedUrl'] = banner;
      cleanedData['thumbnail_signedUrl'] = thumbnail;
    } catch (urlError) {
      console.error("Error generating presigned URLs:", urlError);
      // Continue without presigned URLs
    }

    // Add isEdit and releaseStatus as additional information based on release status (set by checkReleaseStatus middleware)
    cleanedData.isEdit = !["pending", "scheduled_released_cancelled", "approved_scheduled"].includes(req.releaseStatus);
    cleanedData.releaseStatus = req.releaseStatus || null;
    if (cleanedData.isChanges === undefined) cleanedData.isChanges = false;

    res.status(200).json(createSuccessResponse("Data retrieved and cleaned successfully", cleanedData));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error retrieving data:", error);
    throw createDatabaseError("retrieve customer details", error, "exports.GetCustomerDetails");
  }
});

export const updateCustomerDetails = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  const updateFields = { ...req.body };
  if (updateFields.locations && !updateFields.location) {
    updateFields.location = updateFields.locations;
  }
  
  // Check for image deletion flags
  const isBannerDeleted = updateFields.isBannerDeleted === 'true';
  const isThumbnailDeleted = updateFields.isThumbnailDeleted === 'true';
  
  const hasTextFields = updateFields && Object.keys(updateFields).length > 0;
  const hasFileUploads = req.files && Object.keys(req.files).length > 0;
  const hasImageDeletions = isBannerDeleted || isThumbnailDeleted;
  
  if (!hasTextFields && !hasFileUploads && !hasImageDeletions) {
    throw createValidationError("At least one field must be provided for update");
  }

  let banner = "";
  let thumbnail = "";

  console.log("📁 Files received:", req.files);
  console.log("📝 Body received:", req.body);
  console.log("🗑️ Image deletions - Banner:", isBannerDeleted, "Thumbnail:", isThumbnailDeleted);

  try {
    if (req.files) {
      for (const fieldName of ['banner', 'thumbnail']) {
        if (req.files[fieldName]) {
          const file = req.files[fieldName][0];
          const fileKey = `${userData.shop_id}_${fieldName}`;

          const uploadParams = {
            Bucket: "collbine-forbusiness-shop-images",
            Key: fileKey,
            Body: file.buffer,
            ContentType: file.mimetype,
          };

          await s3.send(new PutObjectCommand(uploadParams));
          console.log(`✅ Successfully uploaded ${fieldName} to S3:`, fileKey);
          const fileUrl = s3PublicUrl(SHOP_IMAGES_BUCKET, fileKey);
          console.log(`📁 S3 URL: ${fileUrl}`);

          if (fieldName === 'banner') {
            banner = fileUrl;
          } else if (fieldName === 'thumbnail') {
            thumbnail = fileUrl;
          }
        }
      }
    }

    let updateExpression = "SET ";
    let expressionAttributeNames = {};
    let expressionAttributeValues = {};
    
    const allowedFields = [
      'displayName', 'description', 'website', 'category', 'halalcertified', 'keywords', 'location',
      'instagram', 'facebook', 'whatsapp', 'tiktok', 'phoneNumber'
    ];
    
    let setParts = [];
    let index = 0;

    Object.keys(updateFields).forEach((field) => {
      if (allowedFields.includes(field)) {
        const placeholder = `:val${index}`;
        const namePlaceholder = `#${field}`;
        
        setParts.push(`#${field} = ${placeholder}`);
        expressionAttributeNames[namePlaceholder] = field;
        
        if (field === 'location') {
          const formattedLocation = formatLocationAttribute(updateFields[field]);
          const formattedLocations = formatLocationsListAttribute(updateFields[field]);
          if (!formattedLocation) {
            throw createValidationError("Location must be a valid JSON object");
          }
          if (!formattedLocations) {
            throw createValidationError("Location must be a valid JSON object");
          }
          expressionAttributeValues[placeholder] = formattedLocation;
          const listPlaceholder = `:val${index}_list`;
          setParts.push(`#locations = ${listPlaceholder}`);
          expressionAttributeNames['#locations'] = 'locations';
          expressionAttributeValues[listPlaceholder] = formattedLocations;
        } else {
          expressionAttributeValues[placeholder] = { S: updateFields[field] };
        }
        index++;
      }
    });

    // Handle image updates and deletions
    if (banner) {
      const placeholder = `:val${index}`;
      setParts.push(`#banner = ${placeholder}`);
      expressionAttributeNames['#banner'] = 'banner';
      expressionAttributeValues[placeholder] = { S: banner };
      index++;
    } else if (isBannerDeleted) {
      // User wants to delete banner image - delete from S3 and set to empty
      try {
        const bannerKey = `${userData.shop_id}_banner`;
        await s3.send(new DeleteObjectCommand({
          Bucket: "collbine-forbusiness-shop-images",
          Key: bannerKey
        }));
        console.log(`🗑️ Deleted banner from S3: ${bannerKey}`);
      } catch (s3Error) {
        console.error("Error deleting banner from S3:", s3Error);
        // Continue with database update even if S3 deletion fails
      }
      
      setParts.push(`#banner = :emptyString`);
      expressionAttributeNames['#banner'] = 'banner';
      expressionAttributeValues[':emptyString'] = { S: "" };
    }

    if (thumbnail) {
      const placeholder = `:val${index}`;
      setParts.push(`#thumbnail = ${placeholder}`);
      expressionAttributeNames['#thumbnail'] = 'thumbnail';
      expressionAttributeValues[placeholder] = { S: thumbnail };
      index++;
    } else if (isThumbnailDeleted) {
      // User wants to delete thumbnail image - delete from S3 and set to empty
      try {
        const thumbnailKey = `${userData.shop_id}_thumbnail`;
        await s3.send(new DeleteObjectCommand({
          Bucket: "collbine-forbusiness-shop-images",
          Key: thumbnailKey
        }));
        console.log(`🗑️ Deleted thumbnail from S3: ${thumbnailKey}`);
      } catch (s3Error) {
        console.error("Error deleting thumbnail from S3:", s3Error);
        // Continue with database update even if S3 deletion fails
      }

      setParts.push(`#thumbnail = :emptyString`);
      expressionAttributeNames['#thumbnail'] = 'thumbnail';
      expressionAttributeValues[':emptyString'] = { S: "" };
    }

    if (setParts.length === 0) {
      throw createValidationError("No valid fields provided for update");
    }

    setParts.push('#isChanges = :isChangesVal');
    expressionAttributeNames['#isChanges'] = 'isChanges';
    expressionAttributeValues[':isChangesVal'] = { BOOL: true };

    updateExpression += setParts.join(", ");

    const params = {
      TableName: "CustomerFacingDetails",
      Key: {
        shop_id: { S: userData.shop_id }
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW"
    };

    const result = await client.send(new UpdateItemCommand(params));
    
    // Use the returned Attributes from the update to check all 4 required fields
    if (result.Attributes) {
      const customerData = unmarshall(result.Attributes);
      
      // Check if all 4 required fields are not empty: displayName, description, banner, thumbnail
      const requiredFields = [
        customerData.displayName,
        customerData.description,
        customerData.banner,
        customerData.thumbnail
      ];
      
      const hasAllRequiredField = requiredFields.every(field => 
        field !== undefined && field !== null && String(field).trim() !== ""
      );
      
      // Update hasAllRequiredField (also with ReturnValues: "ALL_NEW" to get final result)
      const updateHasAllParams = {
        TableName: "CustomerFacingDetails",
        Key: {
          shop_id: { S: userData.shop_id }
        },
        UpdateExpression: "SET hasAllRequiredField = :hasAllRequired",
        ExpressionAttributeValues: {
          ":hasAllRequired": { BOOL: hasAllRequiredField }
        },
        ReturnValues: "ALL_NEW"
      };
      
      const finalResult = await client.send(new UpdateItemCommand(updateHasAllParams));
      
      // Clean the returned data from the second update
      let cleanedData = {};
      if (finalResult.Attributes) {
        cleanedData = unmarshall(finalResult.Attributes);
      } else {
        // Fallback to first result if second update doesn't return attributes
        cleanedData = customerData;
        cleanedData.hasAllRequiredField = hasAllRequiredField;
      }
    
      res.status(200).json(createSuccessResponse("Customer details updated successfully", cleanedData));
    } else {
      // Edge case: if first update doesn't return attributes, fetch once
      const getParams = {
        TableName: "CustomerFacingDetails",
        Key: {
          shop_id: { S: userData.shop_id }
        }
      };
      const getResult = await client.send(new GetItemCommand(getParams));
      
      if (getResult.Item) {
        const customerData = unmarshall(getResult.Item);
        
        // Check if all 4 required fields are not empty: displayName, description, banner, thumbnail
        const requiredFields = [
          customerData.displayName,
          customerData.description,
          customerData.banner,
          customerData.thumbnail
        ];
        
        const hasAllRequiredField = requiredFields.every(field => 
          field !== undefined && field !== null && String(field).trim() !== ""
        );
        
        const updateHasAllParams = {
          TableName: "CustomerFacingDetails",
          Key: {
            shop_id: { S: userData.shop_id }
          },
          UpdateExpression: "SET hasAllRequiredField = :hasAllRequired",
          ExpressionAttributeValues: {
            ":hasAllRequired": { BOOL: hasAllRequiredField }
          },
          ReturnValues: "ALL_NEW"
        };
        
        const finalResult = await client.send(new UpdateItemCommand(updateHasAllParams));
        const cleanedData = finalResult.Attributes ? unmarshall(finalResult.Attributes) : customerData;
        
        res.status(200).json(createSuccessResponse("Customer details updated successfully", cleanedData));
      }
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error updating customer details:", error);
    throw createDatabaseError("update customer details", error, "exports.updateCustomerDetails");
  }
});

// ---------- publishUpdate helpers ----------

function parseS3Url(url) {
  if (!url || typeof url !== 'string') return null;

  // Strip query params and fragments (handles presigned URLs)
  const clean = url.split('?')[0].split('#')[0];

  if (clean.startsWith('s3://')) {
    const parts = clean.replace('s3://', '').split('/');
    return { bucket: parts[0], key: parts.slice(1).join('/') };
  }

  // https://bucket.s3.region.amazonaws.com/key
  const virtualHosted = clean.match(/https?:\/\/([^.]+)\.s3[.-][^.]+\.amazonaws\.com\/(.+)/);
  if (virtualHosted) return { bucket: virtualHosted[1], key: virtualHosted[2] };

  // https://s3.region.amazonaws.com/bucket/key
  const pathStyle = clean.match(/https?:\/\/s3[.-][^.]+\.amazonaws\.com\/([^/]+)\/(.+)/);
  if (pathStyle) return { bucket: pathStyle[1], key: pathStyle[2] };

  return null;
}

async function moveImageToLiveBucket(imageUrl) {
  if (!imageUrl) return null;

  const cloudfrontDomain = CLOUDFRONT_DOMAIN;
  const targetBucket = LIVE_IMAGES_BUCKET;

  // CloudFront URLs come from Supabase — DynamoDB always stores the ForBusiness S3 URL,
  // so this guard is a safety net only.
  if (imageUrl.includes(cloudfrontDomain)) return imageUrl;

  const src = parseS3Url(imageUrl);
  if (!src) {
    console.warn(`publishUpdate: could not parse S3 URL: ${imageUrl}`);
    return null;
  }

  // Use a timestamp-versioned destination key so every publish produces a unique
  // CloudFront URL. This avoids stale cache — CloudFront has never seen the new key,
  // so it fetches the fresh image from S3 immediately.
  const destKey = `${src.key}_${Date.now()}`;

  try {
    await s3.send(new CopyObjectCommand({
      Bucket: targetBucket,
      Key: destKey,
      CopySource: `${src.bucket}/${src.key}`
    }));
    console.log(`publishUpdate: copied ${src.bucket}/${src.key} → ${targetBucket}/${destKey}`);
    return `https://${cloudfrontDomain}/${destKey}`;
  } catch (err) {
    if (err.Code === 'NoSuchKey' || err.name === 'NoSuchKey') {
      console.warn(`publishUpdate: source image not found: ${src.bucket}/${src.key}`);
      return null;
    }
    console.error(`publishUpdate: error copying image (${src.bucket}/${src.key}): ${err.message}`);
    return null;
  }
}

async function geocodePostalCode(postalCode, retries = 2) {
  if (!postalCode || postalCode.trim() === '') return null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: `${postalCode.trim()} Singapore`, format: 'json', limit: 1 },
        headers: { 'User-Agent': 'HomeFood-Business-App' },
        timeout: 3500
      });
      if (!response.data || response.data.length === 0) return null;
      const result = response.data[0];
      return { latitude: parseFloat(result.lat), longitude: parseFloat(result.lon) };
    } catch {
      if (attempt === retries) return null;
      await new Promise(r => setTimeout(r, attempt * 250));
    }
  }
  return null;
}

export const publishUpdate = asyncHandler(async (req, res) => {
  if (req.releaseStatus !== 'Released') {
    throw createAuthorizationError('Shop must be Released before publishing updates.');
  }

  const cookie = req.cookies.userDataHTTP;
  if (!cookie) throw createValidationError('Missing userDataHTTP cookie');

  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch {
    throw createValidationError('Invalid cookie data');
  }

  const shop_id = userData.shop_id;

  const { Item } = await client.send(new GetItemCommand({
    TableName: 'CustomerFacingDetails',
    Key: { shop_id: { S: shop_id } }
  }));

  if (!Item) throw createNotFoundError('CustomerFacingDetails record not found');

  const data = unmarshall(Item);

  if (!data.isChanges) {
    return res.status(200).json(createSuccessResponse('No unpublished changes', null));
  }

  const [liveBanner, liveThumbnail] = await Promise.all([
    moveImageToLiveBucket(data.banner),
    moveImageToLiveBucket(data.thumbnail)
  ]);

  const location = data.location || (Array.isArray(data.locations) ? data.locations[0] : null);
  const coords = location?.postalCode ? await geocodePostalCode(location.postalCode) : null;

  const supabasePayload = {
    display_name: data.displayName || null,
    category: data.category || null,
    description: data.description || null,
    keywords: data.keywords || null,
    halal_certified: data.halalcertified === 'Yes',
    phone_number: data.phoneNumber || null,
    whatsapp: data.whatsapp || null,
    instagram: data.instagram || null,
    facebook: data.facebook || null,
    tiktok: data.tiktok || null,
    website: data.website || null,
  };

  if (liveBanner !== null) supabasePayload.banner = liveBanner;
  if (liveThumbnail !== null) supabasePayload.thumbnail = liveThumbnail;

  if (location) {
    const geocodedLocation = { ...location };
    if (coords) {
      geocodedLocation.latitude = coords.latitude;
      geocodedLocation.longitude = coords.longitude;
    }
    supabasePayload.locations = [geocodedLocation];
    if (coords) {
      supabasePayload.latitude = coords.latitude;
      supabasePayload.longitude = coords.longitude;
    }
  }

  if (!supabase) throw createExternalServiceError('Supabase client not initialized');

  const { error: supabaseError } = await supabase
    .from('shops')
    .update(supabasePayload)
    .eq('shop_id', shop_id);

  if (supabaseError) {
    throw createExternalServiceError(`Supabase update failed: ${supabaseError.message}`);
  }

  await client.send(new UpdateItemCommand({
    TableName: 'CustomerFacingDetails',
    Key: { shop_id: { S: shop_id } },
    UpdateExpression: 'SET isChanges = :false',
    ExpressionAttributeValues: { ':false': { BOOL: false } }
  }));

  res.status(200).json(createSuccessResponse('Update published successfully', null));
});

// ---------- end publishUpdate ----------

// ---------- publishMenuUpdate helpers ----------

async function moveMenuImageToLiveBucket(s3Key) {
  if (!s3Key) return null;

  const cloudfrontDomain = CLOUDFRONT_DOMAIN;
  const targetBucket = LIVE_IMAGES_BUCKET;
  const srcBuckets = [MENU_BUCKET, SHOP_IMAGES_BUCKET].filter(Boolean);

  const lastSlash = s3Key.lastIndexOf('/');
  const dir = lastSlash >= 0 ? s3Key.substring(0, lastSlash) : '';
  const filename = lastSlash >= 0 ? s3Key.substring(lastSlash + 1) : s3Key;
  const dotIndex = filename.lastIndexOf('.');
  const ext = dotIndex >= 0 ? filename.substring(dotIndex) : '';
  const base = dotIndex >= 0 ? filename.slice(0, dotIndex) : filename;

  const versionedFilename = `${base}_${Date.now()}${ext}`;
  const versionedKey = dir ? `${dir}/${versionedFilename}` : versionedFilename;
  const encodedVersionedKey = versionedKey.split('/').map(encodeURIComponent).join('/');

  for (const srcBucket of srcBuckets) {
    try {
      await s3.send(new CopyObjectCommand({
        Bucket: targetBucket,
        Key: versionedKey,
        CopySource: `${srcBucket}/${s3Key}`
      }));
      console.log(`publishMenuUpdate: copied ${srcBucket}/${s3Key} → ${targetBucket}/${versionedKey}`);
      return `https://${cloudfrontDomain}/${encodedVersionedKey}`;
    } catch (err) {
      if (err.Code === 'NoSuchKey' || err.name === 'NoSuchKey') continue;
      console.error(`publishMenuUpdate: error copying from ${srcBucket}: ${err.message}`);
    }
  }
  console.warn(`publishMenuUpdate: image not found in any source bucket: ${s3Key}`);
  return null;
}

export const publishMenuUpdate = asyncHandler(async (req, res) => {
  if (req.releaseStatus !== 'Released') {
    throw createAuthorizationError('Shop must be Released before publishing updates.');
  }

  const cookie = req.cookies.userDataHTTP;
  if (!cookie) throw createValidationError('Missing userDataHTTP cookie');

  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch {
    throw createValidationError('Invalid cookie data');
  }

  const shop_id = userData.shop_id;

  const { Item } = await client.send(new GetItemCommand({
    TableName: 'Menus',
    Key: { shop_id: { S: shop_id } }
  }));

  if (!Item) {
    return res.status(200).json(createSuccessResponse('No unpublished changes', null));
  }

  const isChanges = Item.isChanges?.BOOL ?? false;
  if (!isChanges) {
    return res.status(200).json(createSuccessResponse('No unpublished changes', null));
  }

  const menu = JSON.parse(Item.menu.S);

  if (Array.isArray(menu.items)) {
    // One S3 CopyObject per photo, previously sequential. An 80-item menu meant
    // 80 serial round trips — minutes of wall clock inside a function that has a
    // hard timeout. Each copy is independent and moveMenuImageToLiveBucket
    // already swallows its own failures, so bounded concurrency is safe and
    // turns that into ~10 rounds.
    await mapWithConcurrency(menu.items, 8, async (item) => {
      if (!item.photo?.s3Key) return;
      const liveUrl = await moveMenuImageToLiveBucket(item.photo.s3Key);
      if (liveUrl) {
        item.photo.url = liveUrl;
      }
      delete item.photo.s3Key;
    });
  }

  if (!supabase) throw createExternalServiceError('Supabase client not initialized');

  const { error: supabaseError } = await supabase
    .from('shops')
    .update({ menu })
    .eq('shop_id', shop_id);

  if (supabaseError) {
    throw createExternalServiceError(`Supabase menu update failed: ${supabaseError.message}`);
  }

  await client.send(new UpdateItemCommand({
    TableName: 'Menus',
    Key: { shop_id: { S: shop_id } },
    UpdateExpression: 'SET isChanges = :false',
    ExpressionAttributeValues: { ':false': { BOOL: false } }
  }));

  // Menu items are the shop's Stripe products: reconcile the published menu
  // against the connected account. Best-effort — a failure here must not
  // unpublish the menu; the next publish re-syncs from scratch.
  let stripeProductSync;
  try {
    stripeProductSync = await stripeConnectController.syncMenuToStripeProducts(shop_id, menu);
  } catch (err) {
    console.error(`publishMenuUpdate: Stripe product sync failed for shop ${shop_id}: ${err.message}`);
    stripeProductSync = { status: 'failed', error: err.message };
  }

  await recordActivity(req, { action: 'menu.publish', entityType: 'menu' });

  res.status(200).json(createSuccessResponse('Menu update published successfully', { stripeProductSync }));
});

// ---------- end publishMenuUpdate ----------


const sesClient = { send: (command) => getSes().send(command) };
export const InviteUsers = asyncHandler(async (req, res, next) => {
  const {receiverEmail, location_id, role, location_name} = req.body;
  const cookie = req.cookies.userDataHTTP;
  
  console.log("email", receiverEmail);
  
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let shop_id, invitedFromEmail;
  try {
    const cookieData = JSON.parse(cookie);
    shop_id = cookieData.shop_id;
    invitedFromEmail = cookieData.user_id;
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  // Validate required fields
  if (!receiverEmail || !location_id || !location_name || !role) {
    throw createValidationError("Missing required fields: receiverEmail, location_id, location_name, and role are required");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(receiverEmail)) {
    throw createValidationError("Invalid email format");
  }

  // Validate that user cannot invite themselves
  if (receiverEmail === invitedFromEmail) {
    throw createValidationError("Cannot invite myself");
  }

  try {
  const data = await getShopData(shop_id);
  if (data.error) {
    throw createValidationError(data.error === "Shop not found" ? "Shop not found. Cannot invite users." : "Could not load shop data.");
  }
  const lookupKey = typeof data.lookup_key === 'string' ? data.lookup_key.trim() : data.lookup_key;
  // Free shops (no lookup key) get the same seat allowance as Pro.
  const MaxLimitOfUsers = lookupKey != null && lookupKey in productMapping
    ? productMapping[lookupKey]
    : DEFAULT_USER_LIMIT;
  const currentCount = Number(data.NumberOfUsers) || 0;
  console.log('InviteUsers limit check:', { shop_id, lookup_key: lookupKey, MaxLimitOfUsers, currentCount });
  if (currentCount >= MaxLimitOfUsers) {
    throw createValidationError(
      `User limit reached. Your plan allows up to ${MaxLimitOfUsers} users.`
    );
  }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw createDatabaseError("get shop data", error, "exports.InviteUsers");
  }

  // Check if user has already been invited
  try {
    const checkParams = {
      TableName: "invitedUser",
      Key: {
        shop_id: { S: shop_id },
        email: { S: receiverEmail }
      }
    };
    console.log("Checking invitation status with params:", JSON.stringify(checkParams, null, 2));
    const { Item } = await client.send(new GetItemCommand(checkParams));
    console.log("Invitation check result:", Item ? "User already invited" : "User not invited");
    if (Item) {
      throw createConflictError("User has already been invited");
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Database error details:", error);
    throw createDatabaseError("check invitation status", error, "exports.InviteUsers");
  }

  // Check if user is already part of the shop
  try {
    const userCheckParams = {
      TableName: "Users",
      Key: {
        user_id: { S: toUserId(receiverEmail) }
      },
      ProjectionExpression: "shop_id"
    };
    const { Item: userItem } = await client.send(new GetItemCommand(userCheckParams));
    if (userItem && userItem.shop_id && userItem.shop_id.S === shop_id) {
      throw createConflictError("User already part of shop");
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw createDatabaseError("check user shop membership", error, "exports.InviteUsers");
  }

  try {
    // Save invitation to database
  const param2 = {
    TableName: "invitedUser",
    Item: {
        shop_id: { S: shop_id },
        email: { S: receiverEmail },
      location_id: { S: location_id },
      location_name: { S: location_name },
      role: { S: role },
      invitedFrom: { S: invitedFromEmail },
    },
  };

    await client.send(new PutItemCommand(param2));
    console.log("item saved successfully");
    
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw createDatabaseError("save invitation", error, "exports.InviteUsers");
  }

  try {
    const exists = await doesUserExist(receiverEmail);
    const emailContent = !exists ? "Create An Account" : "Account exists";
    
    const params = {
      Source: "sender@example.com", // Must be verified in AWS SES
      Destination: {
        ToAddresses: [receiverEmail], // List of recipient emails
      },
      Message: {
        Subject: { Data: emailContent },
        Body: { Text: { Data: emailContent } },
      },
    };

    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);
    console.log("Email sent successfully:", response);
    console.log("user exists:", exists);

    // Only increment NumberOfUsers AFTER successful email send
    try {
    const updateParams = {
      TableName: "Shops",
      Key: {
        shop_id: { S: shop_id }
      },
      UpdateExpression: "SET NumberOfUsers = NumberOfUsers + :increment",
      ExpressionAttributeValues: {
        ":increment": { N: "1" }
      }
    };
    
    await client.send(new UpdateItemCommand(updateParams));
      console.log("NumberOfUsers incremented successfully after email sent");
    } catch (updateError) {
      console.error("Error incrementing NumberOfUsers:", updateError);
      // Don't fail the whole request if this fails, just log it
    }

    await recordActivity(req, { action: 'user.invite', entityType: 'user', entityId: receiverEmail, detail: { email: receiverEmail, role } });

    res.status(200).json(createSuccessResponse("Invitation sent successfully", {
      userExists: exists,
      emailSent: true
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error sending email:", error);
    throw createExternalServiceError("AWS SES", "send invitation email", error, "exports.InviteUsers");
  }
});

export const sendInvitedUserAgain = asyncHandler(async (req, res, next) => {
  const { receiverEmail } = req.body;
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  if (!receiverEmail) {
    throw createValidationError("receiverEmail is required");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(receiverEmail)) {
    throw createValidationError("Invalid email format");
  }

  try {
    const checkParams = {
      TableName: "invitedUser",
      Key: {
        shop_id: { S: userData.shop_id },
        email: { S: receiverEmail }
      }
    };
    const { Item } = await client.send(new GetItemCommand(checkParams));
    if (!Item) {
      throw createNotFoundError("User was not invited to this shop");
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error checking if user was invited:", error);
    throw createDatabaseError("check invitation status", error, "exports.sendInvitedUserAgain");
  }

  try {
    const exists = await doesUserExist(receiverEmail);
    const emailContent = !exists ? "Create An Account" : "Account exist";

  const params = {
      Source: "sender@example.com",
    Destination: {
        ToAddresses: [receiverEmail],
    },
    Message: {
      Subject: { Data: emailContent },
      Body: { Text: { Data: emailContent } },
    },
  };

    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);
    console.log("Email resent successfully:", response);
    console.log("user exist:", exists);

    res.status(200).json(createSuccessResponse("Invitation email resent successfully", {
      userExists: exists
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error resending email:", error);
    throw createExternalServiceError("AWS SES", "resend invitation email", error, "exports.sendInvitedUserAgain");
  }
});

export const getCardDesignSetting = asyncHandler(async (req, res, next) => {
const shop_id = req.cookies.userDataHTTP;
  
  if (!shop_id) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(shop_id);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  try {
    const params = {
      TableName: 'Card_Design',
      Key: {
        shop_id: { S: userData.shop_id }
      }
    };

    const { Item } = await client.send(new GetItemCommand(params));

    const isEdit = !["pending", "scheduled_released_cancelled", "approved_scheduled"].includes(req.releaseStatus);
    const releaseStatus = req.releaseStatus || null;

    if (!Item) {
      res.status(200).json(createSuccessResponse("No data found for this shop_id", { isEdit, releaseStatus }));
      return;
    }

    let cleanedData = {};
    for (let key in Item) {
      if (typeof Item[key] === "object" && Item[key].S !== undefined) {
        cleanedData[key] = Item[key].S;
      } else {
        cleanedData[key] = Item[key];
      }
    }

    cleanedData.isEdit = isEdit;
    cleanedData.releaseStatus = releaseStatus;

    res.status(200).json(createSuccessResponse("Data retrieved and cleaned successfully", cleanedData));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error retrieving data:", error);
    throw createDatabaseError("retrieve card design settings", error, "exports.getCardDesignSetting");
  }
});

export const cardDesignSetting = asyncHandler(async (req, res, next) => {
  const { backgroundColor, titleColor, footerTextColor, stampBorderColor, noStampBorderColor, noStampBackgroundColor, stampBackgroundColor, checkmarkColor } = req.body;

  if (!backgroundColor || !titleColor || !footerTextColor) {
    throw createValidationError("All design settings (backgroundColor, titleColor, footerTextColor) are required");
  }

  const cookie = req.cookies.userDataHTTP;
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(cookie).shop_id;
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  console.log("cookie ", cookie);

  const params = {
    TableName: "Card_Design",
      Item: {
      shop_id: {S: userData},
        backgroundColor: { S: backgroundColor },
      titleColor: {S: titleColor},
      footerTextColor: {S: footerTextColor},
      stampBorderColor: {S: stampBorderColor},
      noStampBorderColor: {S: noStampBorderColor},
      noStampBackgroundColor: {S: noStampBackgroundColor},
      stampBackgroundColor: { S: stampBackgroundColor },
      checkmarkColor: {S: checkmarkColor}
    },
  };

    try {
      await client.send(new PutItemCommand(params));
    res.status(200).json(createSuccessResponse("Card design settings stored successfully"));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error storing card design settings:", error);
    throw createDatabaseError("store card design settings", error, "exports.cardDesignSetting");
  }
});

export const updateCardDesignSetting = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(cookie);
    } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  const updateFields = req.body;
  
  if (!updateFields || Object.keys(updateFields).length === 0) {
    throw createValidationError("At least one field must be provided for update");
  }

  let updateExpression = "SET ";
  let expressionAttributeNames = {};
  let expressionAttributeValues = {};
  
  const allowedFields = [
    'backgroundColor', 'titleColor', 'footerTextColor', 'stampBorderColor',
    'noStampBorderColor', 'noStampBackgroundColor', 'stampBackgroundColor', 'checkmarkColor'
  ];
  
  let setParts = [];
  Object.keys(updateFields).forEach((field, index) => {
    if (allowedFields.includes(field)) {
      const placeholder = `:val${index}`;
      const namePlaceholder = `#${field}`;
      
      setParts.push(`#${field} = ${placeholder}`);
      expressionAttributeNames[namePlaceholder] = field;
      expressionAttributeValues[placeholder] = { S: updateFields[field] };
    }
  });
  
  if (setParts.length === 0) {
    throw createValidationError("No valid fields provided for update");
  }
  
  updateExpression += setParts.join(", ");

  const params = {
    TableName: "Card_Design",
    Key: {
      shop_id: { S: userData.shop_id }
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW"
  };

  try {
    const result = await client.send(new UpdateItemCommand(params));
    
    let cleanedData = {};
    if (result.Attributes) {
      for (let key in result.Attributes) {
        if (typeof result.Attributes[key] === "object" && result.Attributes[key].S !== undefined) {
          cleanedData[key] = result.Attributes[key].S;
        } else {
          cleanedData[key] = result.Attributes[key];
        }
      }
    }
    
    res.status(200).json(createSuccessResponse("Card design settings updated successfully", cleanedData));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error updating card design:", error);
    throw createDatabaseError("update card design settings", error, "exports.updateCardDesignSetting");
  }
});

export const createCheckoutSession = asyncHandler(async (req, res, next) => {
  const { lookup_key, trial_period_days } = req.body || {};
  
  if (!lookup_key) {
    throw createValidationError("lookup_key is required");
  }

  let shop_id;
  try {
    const cookie = req.cookies.userDataHTTP;
    if (!cookie) {
      throw createValidationError("Missing userDataHTTP cookie");
    }
    shop_id = JSON.parse(cookie).shop_id;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw createValidationError("Invalid cookie data");
  }

  try {
  const prices = await stripe.prices.list({
    lookup_keys: [lookup_key],
    expand: ['data.product'],
  });

    if (!prices.data || prices.data.length === 0) {
      throw createNotFoundError("Price not found for lookup_key");
    }

    const customerId = await getStripeID(shop_id);

  // Ensure Stripe customer has an email (for payment-failed notifications)
  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !customer.deleted && !customer.email) {
        const ownerQuery = await client.send(new QueryCommand({
          TableName: 'Users',
          IndexName: 'shop_id-index',
          KeyConditionExpression: 'shop_id = :shopId',
          FilterExpression: '#role = :ownerRole',
          ExpressionAttributeNames: { '#role': 'role' },
          ExpressionAttributeValues: {
            ':shopId': { S: shop_id },
            ':ownerRole': { S: 'Owner' },
          },
          Limit: 1,
        }));
        const ownerEmail = ownerQuery.Items?.[0]?.user_id?.S;
        if (ownerEmail) {
          await stripe.customers.update(customerId, { email: ownerEmail });
          console.log('createCheckoutSession: set Stripe customer email from shop owner', customerId);
        }
      }
    } catch (err) {
      console.error('createCheckoutSession: ensure customer email:', err.message);
      // Continue without failing checkout
    }
  }

  // Coerce trial_period_days to a number (handles "14" as well as 14)
  const trialDays =
    trial_period_days !== undefined && trial_period_days !== null
      ? Number(trial_period_days)
      : null;

  const sessionParams = {
    billing_address_collection: 'auto',
    // Lets merchants redeem Stripe promotion codes (e.g. the early adopter
    // 100%-off-forever coupon) directly in Checkout. Note: Stripe rejects a
    // session that sets both this and `discounts`.
    allow_promotion_codes: true,
    // When a coupon brings the total to S$0 there is nothing to charge, so
    // don't demand a card. Paid signups still collect one as usual.
    payment_method_collection: 'if_required',
    line_items: [
      {
        price: prices.data[0].id,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `https://business.homefood.sg/app/setting?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `https://business.homefood.sg/app/setting?canceled=true`,
    subscription_data: {
      metadata: {
        shop_id,
        lookup_key,
      },
    },
    metadata: {
      shop_id,
      lookup_key,
    },
  };

  // Optional trial for this subscription
  if (Number.isFinite(trialDays) && trialDays > 0) {
    sessionParams.subscription_data.trial_period_days = Math.trunc(trialDays);
  }

  if (customerId) {
    sessionParams.customer = customerId;
  }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log("Session URL:", session.url);

    res.status(200).json(createSuccessResponse("Checkout session created successfully", { url: session.url }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error creating checkout session:", error);
    throw createExternalServiceError("Stripe", "create checkout session", error, "exports.createCheckoutSession");
  }
});

export const createPortalSession = asyncHandler(async (req, res, next) => {
  let shop_id;
  try {
    const cookie = req.cookies.userDataHTTP;
    if (!cookie) {
      throw createValidationError("Missing userDataHTTP cookie");
    }
    shop_id = JSON.parse(cookie).shop_id;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw createValidationError("Invalid cookie data");
  }

  if (!shop_id) {
    throw createValidationError("shop_id could not be determined from session");
  }

  try {
    const customerId = await getStripeID(shop_id);
    console.log("customerId", customerId);

    if (!customerId) {
      throw createNotFoundError("Stripe customer not found for this shop");
    }

  const returnUrl = 'https://business.homefood.sg/app/setting';

  const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
    return_url: returnUrl,
  });

    res.status(200).json(createSuccessResponse("Billing portal session created successfully", { url: portalSession.url }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error creating portal session:", error);
    throw createExternalServiceError("Stripe", "create portal session", error, "exports.createPortalSession");
  }
});

// Preview upgrade: how much the user will pay if they upgrade to the given lookup_key (proration)
export const previewUpgradeSubscription = asyncHandler(async (req, res, next) => {
  const { lookup_key: newLookupKey } = req.body;
  if (!newLookupKey) {
    throw createValidationError("lookup_key is required");
  }

  let shop_id;
  try {
    const cookie = req.cookies.userDataHTTP;
    if (!cookie) {
      throw createValidationError("Missing userDataHTTP cookie");
    }
    shop_id = JSON.parse(cookie).shop_id;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw createValidationError("Invalid cookie data");
  }

  try {
    const subIdParams = {
      TableName: "Shops",
      Key: { shop_id: { S: shop_id } },
      ProjectionExpression: "subscription_id",
    };
    const subIdResult = await client.send(new GetItemCommand(subIdParams));
    const subscriptionId = subIdResult.Item?.subscription_id?.S;

    if (!subscriptionId) {
      throw createNotFoundError("subscription_id not found for this shop");
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price'],
    });
    const currentItem = subscription.items.data[0];
    if (!currentItem) {
      throw createNotFoundError("Subscription has no items to update");
    }

    const currentLookupKey =
      currentItem.price?.lookup_key ||
      subscription.metadata?.lookup_key ||
      null;
    const currentRank = getTierRank(currentLookupKey);
    const newRank = getTierRank(newLookupKey);
    if (currentRank != null && newRank != null && newRank <= currentRank) {
      throw createValidationError("Requested plan is not an upgrade. Please choose a higher tier plan.");
    }
    //fsadsadasdasas
    const prices = await stripe.prices.list({
      lookup_keys: [newLookupKey],
      limit: 1,
    });
    if (!prices.data || prices.data.length === 0) {
      throw createNotFoundError("Price not found for lookup_key");
    }
    const newPrice = prices.data[0];
    const isYearlyPlan = newPrice.recurring?.interval === 'year';

    // Monthly → yearly: charge full year now with proration (credit for unused monthly). Otherwise: prorate only.
    const previewParams = {
      subscription: subscription.id,
      subscription_details: {
        items: [
          {
            id: currentItem.id,
            price: newPrice.id,
            quantity: currentItem.quantity ?? 1,
          },
        ],
        ...(isYearlyPlan
          ? { billing_cycle_anchor: 'now', proration_behavior: 'create_prorations' }
          : { proration_behavior: 'create_prorations' }),
      },
    };
    let upcoming;
    try {
      upcoming = await stripe.invoices.createPreview(previewParams);
    } catch (stripeErr) {
      const msg = stripeErr?.message || stripeErr?.raw?.error?.message || String(stripeErr);
      console.error("Stripe createPreview error:", msg, stripeErr?.code);
      throw new AppError(
        msg,
        ERROR_TYPES.EXTERNAL_SERVICE_ERROR,
        502
      );
    }

    const currency = (upcoming.currency || 'sgd').toUpperCase();
    const rawLines = upcoming.lines?.data || [];

    const isProrationLine = (l) => {
      if (l.proration === true) return true;
      if (l.proration === false) return false;
      const desc = typeof l.description === 'string' ? l.description : '';
      return desc.startsWith('Unused time on') || desc.startsWith('Remaining time on');
    };

    // Monthly→yearly: preview used billing_cycle_anchor 'now', so full invoice is due today.
    const amountDueToday = isYearlyPlan
      ? (upcoming.amount_due ?? 0)
      : Math.max(0, rawLines.filter((l) => isProrationLine(l)).reduce((sum, l) => sum + (l.amount || 0), 0));
    const amountDueTodayFormatted = (amountDueToday / 100).toFixed(2);

    const netProration = rawLines.filter((l) => isProrationLine(l)).reduce((sum, l) => sum + (l.amount || 0), 0);
    const recurringLine = rawLines.find((l) => !isProrationLine(l));
    const new_recurring_amount = recurringLine ? (recurringLine.amount ?? 0) : null;
    const new_recurring_amount_formatted =
      new_recurring_amount != null ? (new_recurring_amount / 100).toFixed(2) : null;

    res.status(200).json(
      createSuccessResponse("Preview upgrade invoice", {
        currency,
        amount_due_today: amountDueToday,
        amount_due_today_formatted: amountDueTodayFormatted,
        net_proration: netProration,
        net_proration_formatted: (netProration / 100).toFixed(2),
        new_recurring_amount,
        new_recurring_amount_formatted,
      })
    );
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error previewing upgrade:", error?.message ?? error);
    const message = error?.message ? `Stripe: ${error.message}` : "Stripe preview upgrade invoice failed";
    throw createExternalServiceError("Stripe", "preview upgrade invoice", error, "exports.previewUpgradeSubscription");
  }
});

// Upgrade subscription: e.g. monthly -> yearly, apply proration immediately
export const upgradeSubscriptionPlan = asyncHandler(async (req, res, next) => {
  const { lookup_key: newLookupKey } = req.body;

  if (!newLookupKey) {
    throw createValidationError("lookup_key is required");
  }

  // Get shop_id from cookie (same pattern as createCheckoutSession)
  let shop_id;
  try {
    const cookie = req.cookies.userDataHTTP;
    if (!cookie) {
      throw createValidationError("Missing userDataHTTP cookie");
    }
    shop_id = JSON.parse(cookie).shop_id;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw createValidationError("Invalid cookie data");
  }

  try {
    // Read subscription_id for this shop directly from Shops table
    const subIdParams = {
      TableName: "Shops",
      Key: { shop_id: { S: shop_id } },
      ProjectionExpression: "subscription_id",
    };
    const subIdResult = await client.send(new GetItemCommand(subIdParams));
    const subscriptionId = subIdResult.Item?.subscription_id?.S;

    if (!subscriptionId) {
      throw createNotFoundError("subscription_id not found for this shop");
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price'],
    });
    if (!subscription) {
      throw createNotFoundError("No subscription found to upgrade");
    }

    const currentItem = subscription.items.data[0];
    if (!currentItem) {
      throw createNotFoundError("Subscription has no items to update");
    }

    const currentLookupKey =
      currentItem.price?.lookup_key ||
      subscription.metadata?.lookup_key ||
      null;
    const currentRank = getTierRank(currentLookupKey);
    const newRank = getTierRank(newLookupKey);
    if (currentRank != null && newRank != null && newRank <= currentRank) {
      throw createValidationError("Requested plan is not an upgrade. Please choose a higher tier plan.");
    }

    // Resolve the new price from lookup_key
    const prices = await stripe.prices.list({
      lookup_keys: [newLookupKey],
      expand: ['data.product'],
      limit: 1,
    });

    if (!prices.data || prices.data.length === 0) {
      throw createNotFoundError("Price not found for lookup_key");
    }

    const newPrice = prices.data[0];
    const isYearlyPlan = newPrice.recurring?.interval === 'year';

    // Monthly → yearly: charge full year now with proration (credit for unused monthly). Otherwise: prorate and invoice now.
    const updateParams = {
      items: [
        {
          id: currentItem.id,
          price: newPrice.id,
        },
      ],
      ...(isYearlyPlan
        ? { billing_cycle_anchor: 'now', proration_behavior: 'always_invoice' }
        : { proration_behavior: 'always_invoice' }),
      expand: ['latest_invoice.payment_intent'],
    };
    const updated = await stripe.subscriptions.update(subscription.id, updateParams);

    await setShopUpgradePaymentStatus(shop_id, 'pending');

    const latestInvoice = updated.latest_invoice;
    const paymentIntent = latestInvoice?.payment_intent;
    const paymentStatus =
      typeof paymentIntent?.status === 'string'
        ? paymentIntent.status
        : latestInvoice?.status === 'paid'
          ? 'succeeded'
          : latestInvoice?.status === 'open'
            ? 'processing'
            : null;

    res.status(200).json(
      createSuccessResponse("Subscription upgraded successfully", {
        subscription_id: updated.id,
        old_price_id: currentItem.price.id,
        new_price_id: newPrice.id,
        lookup_key: newPrice.lookup_key || newLookupKey,
        invoice_id: latestInvoice?.id ?? null,
        payment_status: paymentStatus,
      })
    );
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error upgrading subscription plan:", error);
    throw createExternalServiceError("Stripe", "upgrade subscription", error, "exports.upgradeSubscriptionPlan");
  }
});

// Downgrade subscription: e.g. yearly -> monthly, schedule change at period end (no immediate proration)
export const downgradeSubscriptionPlan = asyncHandler(async (req, res, next) => {
  const { lookup_key: newLookupKey } = req.body;

  if (!newLookupKey) {
    throw createValidationError("lookup_key is required");
  }

  let shop_id;
  try {
    const cookie = req.cookies.userDataHTTP;
    if (!cookie) {
      throw createValidationError("Missing userDataHTTP cookie");
    }
    shop_id = JSON.parse(cookie).shop_id;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw createValidationError("Invalid cookie data");
  }

  try {
    const subIdParams = {
      TableName: "Shops",
      Key: { shop_id: { S: shop_id } },
      ProjectionExpression: "subscription_id",
    };
    const subIdResult = await client.send(new GetItemCommand(subIdParams));
    const subscriptionId = subIdResult.Item?.subscription_id?.S;

    if (!subscriptionId) {
      throw createNotFoundError("subscription_id not found for this shop");
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price', 'schedule'],
    });
    if (!subscription) {
      throw createNotFoundError("No subscription found to downgrade");
    }

    if (subscription.schedule) {
      throw createValidationError("A subscription schedule already exists for this subscription. Wait for it to complete or cancel it before scheduling another downgrade.");
    }

    const currentItem = subscription.items.data[0];
    if (!currentItem) {
      throw createNotFoundError("Subscription has no items to update");
    }

    const currentLookupKey =
      currentItem.price?.lookup_key ||
      subscription.metadata?.lookup_key ||
      null;
    const currentRank = getTierRank(currentLookupKey);
    const newRank = getTierRank(newLookupKey);
    if (currentRank != null && newRank != null && newRank >= currentRank) {
      throw createValidationError("Requested plan is not a downgrade. Please choose a lower tier plan.");
    }

    const prices = await stripe.prices.list({
      lookup_keys: [newLookupKey],
      expand: ['data.product'],
      limit: 1,
    });

    if (!prices.data || prices.data.length === 0) {
      throw createNotFoundError("Price not found for lookup_key");
    }

    const newPrice = prices.data[0];

    // Stripe "Change subscriptions": create schedule from subscription, then update with two phases.
    // https://docs.stripe.com/billing/subscriptions/subscription-schedules
    const baseSchedule = await stripe.subscriptionSchedules.create({
      from_subscription: subscription.id,
    });

    const currentPhase = baseSchedule.phases?.[0];
    if (!currentPhase || currentPhase.start_date == null || currentPhase.end_date == null) {
      await stripe.subscriptionSchedules.release(baseSchedule.id).catch(() => {});
      throw createValidationError("Could not read current phase from schedule; please try again.");
    }

    // Phase 0: current plan until period end (use start_date/end_date from schedule Stripe created).
    // Phase 1: new price; last phase + end_behavior=release so no duration/end_date needed.
    const schedule = await stripe.subscriptionSchedules.update(baseSchedule.id, {
      end_behavior: 'release',
      phases: [
        {
          start_date: currentPhase.start_date,
          end_date: currentPhase.end_date,
          items: currentPhase.items.map((item) => ({
            price: typeof item.price === 'string' ? item.price : item.price?.id ?? item.price,
            quantity: item.quantity ?? 1,
          })),
        },
        {
          items: [
            { price: newPrice.id, quantity: currentItem.quantity || 1 },
          ],
        },
      ],
    });

    const periodEnd = typeof currentPhase.end_date === 'number' ? currentPhase.end_date : subscription.current_period_end;

    res.status(200).json(
      createSuccessResponse("Subscription downgrade scheduled for next billing period", {
        subscription_id: subscription.id,
        schedule_id: schedule.id,
        old_price_id: currentItem.price.id,
        new_price_id: newPrice.id,
        lookup_key: newPrice.lookup_key || newLookupKey,
        effective_at: periodEnd,
      })
    );
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const msg = error?.message || error?.raw?.error?.message || String(error);
    console.error("Error downgrading subscription plan:", msg, error?.code);
    throw new AppError(msg, ERROR_TYPES.EXTERNAL_SERVICE_ERROR, 502);
  }
});

export const getUpgradePaymentStatus = asyncHandler(async (req, res) => {
  let shop_id;
  try {
    const cookie = req.cookies.userDataHTTP;
    if (!cookie) {
      throw createValidationError("Missing userDataHTTP cookie");
    }
    shop_id = JSON.parse(cookie).shop_id;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw createValidationError("Invalid cookie data");
  }
  const status = await getShopUpgradePaymentStatus(shop_id);
  res.status(200).json(
    createSuccessResponse("Upgrade payment status", {
      status: status === 'paid' || status === 'failed' ? status : 'pending',
    })
  );
});

export const cancelSubscriptionSchedule = asyncHandler(async (req, res) => {
  let shop_id;
  try {
    const cookie = req.cookies.userDataHTTP;
    if (!cookie) {
      throw createValidationError("Missing userDataHTTP cookie");
    }
    shop_id = JSON.parse(cookie).shop_id;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw createValidationError("Invalid cookie data");
  }

  const subIdResult = await client.send(new GetItemCommand({
    TableName: "Shops",
    Key: { shop_id: { S: shop_id } },
    ProjectionExpression: "subscription_id",
  }));
  const subscriptionId = subIdResult.Item?.subscription_id?.S;

  if (!subscriptionId) {
    throw createNotFoundError("No subscription found for this shop");
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['schedule'],
  });
  const scheduleRef = subscription.schedule;
  if (!scheduleRef) {
    throw createValidationError("No subscription schedule to cancel. Your plan is not set to change.");
  }

  const scheduleId = typeof scheduleRef === 'string' ? scheduleRef : scheduleRef?.id;
  if (!scheduleId) {
    throw createValidationError("Could not determine schedule id.");
  }

  await stripe.subscriptionSchedules.release(scheduleId);

  res.status(200).json(
    createSuccessResponse("Subscription schedule cancelled. Your plan will not change at period end.", {
      subscription_id: subscriptionId,
      schedule_id: scheduleId,
    })
  );
});

export const getSubscriptionEndDate = asyncHandler(async (req, res) => {
  let shop_id;
  try {
    const cookie = req.cookies.userDataHTTP;
    if (!cookie) {
      throw createValidationError("Missing userDataHTTP cookie");
    }
    shop_id = JSON.parse(cookie).shop_id;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw createValidationError("Invalid cookie data");
  }

  const subIdResult = await client.send(new GetItemCommand({
    TableName: "Shops",
    Key: { shop_id: { S: shop_id } },
    ProjectionExpression: "subscription_id",
  }));
  const subscriptionId = subIdResult.Item?.subscription_id?.S;

  if (!subscriptionId) {
    return res.status(200).json(
      createSuccessResponse("Subscription end date", {
        status: null,
        cancel_at_period_end: false,
        service_ends_at: null,
        service_ends_at_formatted: null,
        scheduled_downgrade_effective_at: null,
        scheduled_downgrade_effective_at_formatted: null,
      })
    );
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['schedule'],
  });
  const status = subscription.status;
  const cancelAtPeriodEnd = !!subscription.cancel_at_period_end;

  // Resolve schedule (may be expanded object or just id)
  let schedule = subscription.schedule;
  if (typeof schedule === 'string' && schedule) {
    try {
      schedule = await stripe.subscriptionSchedules.retrieve(schedule);
    } catch (e) {
      schedule = null;
    }
  }

  let scheduledDowngradeEffectiveAt = null;
  if (schedule && schedule.phases && schedule.phases.length >= 2) {
    const currentPhase = schedule.phases[0];
    scheduledDowngradeEffectiveAt = currentPhase?.end_date ?? schedule.phases[1]?.start_date ?? null;
  }

  // Service end: explicit cancel date, or period end (from subscription or schedule phase 0)
  const periodEnd = subscription.current_period_end ?? (schedule?.phases?.[0]?.end_date) ?? null;
  const serviceEndsAt = subscription.cancel_at ?? periodEnd ?? null;
  const serviceEndsAtFormatted =
    serviceEndsAt != null ? new Date(serviceEndsAt * 1000).toISOString() : null;
  const scheduledDowngradeFormatted =
    scheduledDowngradeEffectiveAt != null
      ? new Date(scheduledDowngradeEffectiveAt * 1000).toISOString()
      : null;

  res.status(200).json(
    createSuccessResponse("Subscription end date", {
      status,
      cancel_at_period_end: cancelAtPeriodEnd,
      service_ends_at: serviceEndsAt,
      service_ends_at_formatted: serviceEndsAtFormatted,
      scheduled_downgrade_effective_at: scheduledDowngradeEffectiveAt,
      scheduled_downgrade_effective_at_formatted: scheduledDowngradeFormatted,
    })
  );
});

// Stripe webhook (no auth – Stripe has no cookies/Bearer). Use express.raw() for this route.
export const handleStripeWebhook = async (req, res) => {
  console.log('[Webhook] Stripe webhook request received');
  const signature = req.headers['stripe-signature'];
  const rawBody = Buffer.isBuffer(req.body) ? req.body : (typeof req.body === 'string' ? Buffer.from(req.body, 'utf8') : req.body);
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, stripe_webhookSecret);
  } catch (err) {
    console.log('[Webhook] Signature verification failed:', err.message);
    return res.sendStatus(400);
  }
  console.log('[Webhook] Verified event:', event.type, event.id);
  const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'sender@example.com';
  const PAYMENT_FAILED_EMAIL_OVERRIDE = process.env.PAYMENT_FAILED_EMAIL_OVERRIDE || '';
  let subscription, status;
  try {
    switch (event.type) {
      case 'customer.subscription.trial_will_end':
        return res.json({ received: true });
      case 'customer.subscription.updated':
        subscription = event.data.object;
        status = subscription.status;
        {
          const shopIdUpdated = subscription.metadata?.shop_id;
          const lookupKeyUpdated =
            subscription.items?.data?.[0]?.price?.lookup_key ||
            subscription.items?.data?.[0]?.price?.id ||
            '';
          const customerIdUpdated = subscription.customer;
          const subscriptionIdUpdated = subscription.id;

          if (shopIdUpdated && customerIdUpdated) {
            await updateItem(
              'Shops',
              shopIdUpdated,
              String(customerIdUpdated),
              lookupKeyUpdated,
              subscriptionIdUpdated || '',
              'SubscriptionStatus',
              status
            );
            await updateCustomerSubscriptionStatus(shopIdUpdated, status);
            console.log('[Webhook] Updated subscription for shop:', shopIdUpdated, {
              status,
              lookup_key: lookupKeyUpdated,
              subscription_id: subscriptionIdUpdated,
            });
          }
        }
        return res.json({ received: true });
      case 'customer.subscription.deleted':
        subscription = event.data.object;
        if (subscription.metadata?.shop_id) {
          await updateCustomerSubscriptionStatus(subscription.metadata.shop_id, 'cancelled');
          console.log('[Webhook] Subscription cancelled for shop:', subscription.metadata.shop_id);
        }
        return res.json({ received: true });
      case 'invoice.paid': {
        const invoicePaid = event.data.object;
        let shopIdPaid = null;
        if (invoicePaid.subscription) {
          try {
            const sub = await stripe.subscriptions.retrieve(invoicePaid.subscription);
            shopIdPaid = sub.metadata?.shop_id;
          } catch (e) {}
        }
        if (shopIdPaid) {
          await putInvoiceItem(shopIdPaid, invoicePaid);
          if (invoicePaid.billing_reason === 'subscription_update') {
            await setShopUpgradePaymentStatus(shopIdPaid, 'paid');
          }
          console.log('[Webhook] Saved invoice for shop:', shopIdPaid);
        }
        return res.json({ received: true });
      }
      case 'invoice.payment_failed': {
        const invoiceFailed = event.data.object;
        const invoiceId = invoiceFailed.id;
        if (invoiceFailed.billing_reason === 'subscription_update' && invoiceFailed.subscription) {
          try {
            const sub = await stripe.subscriptions.retrieve(invoiceFailed.subscription);
            const shopIdFailed = sub.metadata?.shop_id;
            if (shopIdFailed) await setShopUpgradePaymentStatus(shopIdFailed, 'failed');
          } catch (e) {}
        }
        if (await getPaymentFailedEmailSent(invoiceId)) return res.json({ received: true });
        const emailTo = PAYMENT_FAILED_EMAIL_OVERRIDE || invoiceFailed.customer_email || null;
        if (!emailTo) return res.json({ received: true });
        const amountDue = (invoiceFailed.amount_due ?? 0) / 100;
        const currency = (invoiceFailed.currency || 'sgd').toUpperCase();
        const amountText = amountDue > 0 ? ` (${currency} ${amountDue.toFixed(2)})` : '';
        const message = `Your payment for invoice ${invoiceId}${amountText} could not be processed. This may be for a subscription change or renewal. Please update your payment method in your account settings and we will retry, or contact support if you need help.`;
        try {
          await sesClient.send(new SendEmailCommand({
            Source: SES_FROM_EMAIL,
            Destination: { ToAddresses: [emailTo] },
            Message: {
              Subject: { Data: 'Payment failed – HomeFood' },
              Body: { Text: { Data: message } },
            },
          }));
          await setPaymentFailedEmailSent(invoiceId);
          console.log('[Webhook] Payment-failed email sent for invoice:', invoiceId);
        } catch (e) {}
        return res.json({ received: true });
      }
      case 'checkout.session.completed': {
        const session = event.data.object;
        const shop_id = session.metadata?.shop_id;
        const lookup_key = session.metadata?.lookup_key;
        const customerID = session.customer;
        const subscriptionId = session.subscription || null;
        if (!shop_id || !lookup_key || !customerID) return res.json({ received: true });
        try {
          await updateItem('Shops', shop_id, customerID, lookup_key, subscriptionId || '', 'SubscriptionStatus', 'active');
          console.log('[Webhook] Checkout completed: updated Shops for shop_id', shop_id);
        } catch (e) {}
        return res.json({ received: true });
      }
      default:
        console.log('[Webhook] Unhandled event type:', event.type);
        return res.json({ received: true });
    }
  } catch (err) {
    console.error('[Webhook] Handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

// New export for getListOfLocations
export const getListOfLocations = asyncHandler(async (req, res, next) => {
  const shop_id_cookie = req.cookies.userDataHTTP;
  
  if (!shop_id_cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(shop_id_cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }
  
  try {
    const params = {
      TableName: 'CustomerFacingDetails',
      Key: {
        shop_id: { S: userData.shop_id }
      }
    };
    
    const { Item } = await client.send(new GetItemCommand(params));
    
    if (!Item) {
      res.status(200).json(createSuccessResponse("No locations found for this shop_id", []));
      return;
    }

    const cleanedData = unmarshall(Item);
    let locations = [];
    if (Array.isArray(cleanedData.locations)) {
      locations = cleanedData.locations;
    } else if (cleanedData.location && typeof cleanedData.location === "object") {
      locations = [cleanedData.location];
    }

    if (locations.length === 0) {
      res.status(200).json(createSuccessResponse("No locations found for this shop_id", []));
      return;
    }

    res.status(200).json(createSuccessResponse("Locations retrieved successfully", { locations }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error retrieving locations:", error);
    throw createDatabaseError("retrieve locations", error, "exports.getListOfLocations");
  }
});




async function generatePresignedUrls(imageNames,cookie) {

  const bucketName = "collbine-forbusiness-shop-images";
  const expiresIn = 3600; // 1 hour expiration
  // Map through imageNames and create a presigned URL for each
  const urls = await Promise.all(
      imageNames.map(async (imageName) => {
          const objectKey = cookie+"_"+imageName;; // Modify the path if needed
          const command = new GetObjectCommand({
              Bucket: bucketName,
              Key: objectKey,
          });

          const signedUrl = await getSignedUrl(getS3(), command, { expiresIn });
          return { imageName, signedUrl };
      })
  );

  return urls; // Returns an array of objects with image names and URLs
}



function cleanJson(data) {
  if (Array.isArray(data)) {
      return data.map(cleanJson);
  } else if (typeof data === 'object' && data !== null) {
      if ('S' in data) return data.S;
      if ('N' in data) return Number(data.N);
      if ('BOOL' in data) return data.BOOL;
      if ('L' in data) return cleanJson(data.L);
      if ('M' in data) return cleanJson(data.M);

      return Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, cleanJson(value)])
      );
  }
  return data;
}
// Max team members per plan. Free and Pro allow the same number — the plans
// differ on payment processing rates and AI PayNow verification, not on seats.
const DEFAULT_USER_LIMIT = 6;
const productMapping = {
  "homefood_pro_monthly": DEFAULT_USER_LIMIT,
  "homefood_pro_yearly": DEFAULT_USER_LIMIT,
};

// Tier ladder for upgrade/downgrade comparisons (higher number = higher tier).
// No lookup key at all means the shop is on Free, which getTierRank maps to 0.
const tierRank = {
  "homefood_pro_monthly": 1,
  "homefood_pro_yearly": 2,
};

function getTierRank(lookupKey) {
  // No subscription means the shop sits on Free, the bottom of the ladder.
  if (!lookupKey) return 0;
  const key = String(lookupKey).trim();
  return Object.prototype.hasOwnProperty.call(tierRank, key) ? tierRank[key] : null;
}

async function getShopData(shop_id) {
  const params = {
    TableName: "Shops",
    Key: {
      shop_id: { S: shop_id }
    },
    ProjectionExpression: "lookup_key, NumberOfUsers, StripeCustomerSubscriptionStatus"
  };

  try {
    const command = new GetItemCommand(params);
    const response = await client.send(command);

    if (!response.Item) {
      return { error: "Shop not found" };
    }

    const item = unmarshall(response.Item);
    return {
      lookup_key: item.lookup_key,
      NumberOfUsers: item.NumberOfUsers,
      StripeCustomerSubscriptionStatus: item.StripeCustomerSubscriptionStatus
    };
  } catch (error) {
    console.error("Error retrieving shop data:", error);
    return { error: "Error retrieving shop data" };
  }
}

export const getListOfUsers = asyncHandler(async (req, res, next) => {
  const shop_id_cookie = req.cookies.userDataHTTP;
  
  if (!shop_id_cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(shop_id_cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }
  
  try {
    // Get invited users
    const invitedParams = {
      TableName: "invitedUser",
      IndexName: "shop_id-index",
      KeyConditionExpression: "shop_id = :shopId",
      ExpressionAttributeValues: {
        ":shopId": { S: userData.shop_id },
      },
    };

    const { Items: invitedItems } = await client.send(new QueryCommand(invitedParams));

    // Get actual users using the GSI
    const usersParams = {
      TableName: "Users",
      IndexName: "shop_id-index",
      KeyConditionExpression: "shop_id = :shopId",
      ExpressionAttributeValues: {
        ":shopId": { S: userData.shop_id },
      },
    };

    const { Items: usersItems } = await client.send(new QueryCommand(usersParams));

    // Clean invited users data
    let invitedUsers = [];
    if (invitedItems && invitedItems.length > 0) {
      invitedUsers = invitedItems.map((item) => {
        let cleanedItem = {};
        for (let key in item) {
          cleanedItem[key] = item[key].S ?? item[key];
        }
        return cleanedItem;
      });
    }

    // Clean actual users data
    let actualUsers = [];
    if (usersItems && usersItems.length > 0) {
      actualUsers = usersItems.map((item) => {
        let cleanedItem = {};
        for (let key in item) {
          if (typeof item[key] === "object" && item[key].S !== undefined) {
            cleanedItem[key] = item[key].S;
          } else if (typeof item[key] === "object" && item[key].BOOL !== undefined) {
            cleanedItem[key] = item[key].BOOL;
          } else {
            cleanedItem[key] = item[key];
          }
        }
        return cleanedItem;
      });
    }

    res.status(200).json(createSuccessResponse("Users retrieved successfully", {
      invited_users: invitedUsers,
      actual_users: actualUsers,
      invited_count: invitedUsers.length,
      actual_count: actualUsers.length,
      total_count: invitedUsers.length + actualUsers.length
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error retrieving users:", error);
    throw createDatabaseError("retrieve users", error, "exports.getListOfUsers");
  }
});

export const getListOfInvitiedUsers = asyncHandler(async (req, res, next) => {
  const shop_id_cookie = req.cookies.userDataHTTP;
  
  if (!shop_id_cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(shop_id_cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }
  
  try {
    // Get only invited users
    const invitedParams = {
      TableName: "invitedUser",
      IndexName: "shop_id-index",
      KeyConditionExpression: "shop_id = :shopId",
      ExpressionAttributeValues: {
        ":shopId": { S: userData.shop_id },
      },
    };

    const { Items: invitedItems } = await client.send(new QueryCommand(invitedParams));

    // Clean invited users data
    let invitedUsers = [];
    if (invitedItems && invitedItems.length > 0) {
      invitedUsers = invitedItems.map((item) => {
        let cleanedItem = {};
        for (let key in item) {
          cleanedItem[key] = item[key].S ?? item[key];
        }
        return cleanedItem;
      });
    }

    res.status(200).json(createSuccessResponse("Invited users retrieved successfully", {
      invited_users: invitedUsers,
      invited_count: invitedUsers.length
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error retrieving invited users:", error);
    throw createDatabaseError("retrieve invited users", error, "exports.getListOfInvitiedUsers");
  }
});

export const acceptInvitation = asyncHandler(async (req, res, next) => {
  const { email, shop_id } = req.body;
  const cookie = req.cookies.userDataHTTP;

  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie. Please log in first, then accept the invitation.");
  }

  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  if (!email || !shop_id) {
    throw createValidationError("Email and shop_id are required");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createValidationError("Invalid email format");
  }

  // Only the invitee can accept their own invitation (logged-in user must match email)
  const loggedInUserId = (userData.user_id || "").trim().toLowerCase();
  const inviteeEmail = String(email).trim().toLowerCase();
  if (loggedInUserId !== inviteeEmail) {
    throw createValidationError("You can only accept an invitation for your own account. Please log in as " + email + " to accept.");
  }

  try {
    // 1. Check if invitation exists
    console.log("Checking invitation for:", email, "in shop:", shop_id);
    const invitationParams = {
      TableName: "invitedUser",
      Key: {
        shop_id: { S: shop_id },
        email: { S: email }
      }
    };
    
    const { Item: invitation } = await client.send(new GetItemCommand(invitationParams));
    if (!invitation) {
      console.log("Invitation not found for:", email, "in shop:", shop_id);
      throw createNotFoundError("Invitation");
    }
    console.log("Invitation found:", invitation);

    // 2. Check if user already exists
    const userParams = {
      TableName: "Users",
      Key: {
        user_id: { S: toUserId(email) }
      }
    };
    
    const { Item: existingUserItem } = await client.send(new GetItemCommand(userParams));

    if (existingUserItem) {
      const existingUser = unmarshall(existingUserItem);
      const oldShopId = existingUser.shop_id != null ? String(existingUser.shop_id).trim() : "";
      const oldRole = existingUser.role != null ? String(existingUser.role).trim() : "";

      // 3a. User exists - check ownership and handle accordingly
      console.log("User exists, checking ownership and shop status...");
      console.log("Old shop ID:", oldShopId, "Old role:", oldRole);

      // If user has no current shop (incomplete record), treat as new join: just update and delete invite
      if (!oldShopId || !oldRole) {
        const updateAndDeleteParams = {
          TransactItems: [
            {
              Update: {
                TableName: "Users",
                Key: { user_id: { S: toUserId(email) } },
                UpdateExpression: "SET shop_id = :newShopId, #role = :newRole",
                ExpressionAttributeNames: { "#role": "role" },
                ExpressionAttributeValues: {
                  ":newShopId": { S: shop_id },
                  ":newRole": { S: invitation.role.S }
                }
              }
            },
            {
              Delete: {
                TableName: "invitedUser",
                Key: { shop_id: { S: shop_id }, email: { S: email } }
              }
            }
          ]
        };
        await client.send(new TransactWriteItemsCommand(updateAndDeleteParams));
        return res.status(200).json(createSuccessResponse("Invitation accepted", {
          email,
          shop_id,
          action: "user_joined_shop",
          message: "You have joined the shop."
        }));
      }

      // Check if user is owner of their current shop
      const isOwner = oldRole.toLowerCase() === "owner";
      console.log("Is user owner of current shop:", isOwner);
      
      if (isOwner) {
        // User is owner - check if they are the only user in the shop
        console.log("User is owner, checking if they are the only user in shop...");
        
        const userCountParams = {
          TableName: "Users",
          IndexName: "shop_id-index",
          KeyConditionExpression: "shop_id = :shopId",
          ExpressionAttributeValues: {
            ":shopId": { S: oldShopId }
          },
          Select: "COUNT"
        };
        
        const { Count: userCount } = await client.send(new QueryCommand(userCountParams));
        console.log("Number of users in current shop:", userCount);
        
        if (userCount > 1) {
          // Owner has other users in shop - throw error
          throw createValidationError("Please remove all other users from your current shop before accepting this invitation. You are the owner and there are other users in your shop.");
        }
        
        // Owner is the only user - proceed with backup, update, and delete
        console.log("Owner is the only user, proceeding with backup and update...");
        
        const transactParams = {
          TransactItems: [
            {
              // Backup old user data
              Put: {
                TableName: "userBackup",
                Item: {
                  user_id: { S: toUserId(email) },
                  old_shop_id: { S: oldShopId },
                  role: { S: oldRole },
                  backed_up_at: { S: new Date().toISOString() },
                  new_shop_id: { S: shop_id }
                }
              }
            },
            {
              // Update user's shop_id and role
              Update: {
                TableName: "Users",
                Key: {
                  user_id: { S: toUserId(email) }
                },
                UpdateExpression: "SET shop_id = :newShopId, #role = :newRole",
                ExpressionAttributeNames: {
                  "#role": "role"
                },
                ExpressionAttributeValues: {
                  ":newShopId": { S: shop_id },
                  ":newRole": { S: invitation.role.S }
                }
              }
            },
            {
              // Delete invitation
              Delete: {
                TableName: "invitedUser",
                Key: {
                  shop_id: { S: shop_id },
                  email: { S: email }
                }
              }
            }
          ]
        };
        
        console.log("Executing transaction for owner user...");
        await client.send(new TransactWriteItemsCommand(transactParams));
        console.log("Transaction completed successfully");
        
        res.status(200).json(createSuccessResponse("Invitation accepted - owner updated with backup", {
          email: email,
          shop_id: shop_id,
          old_shop_id: oldShopId,
          action: "updated_owner_user",
          backed_up: true,
          message: "Owner data has been backed up and user updated to new shop"
        }));
        
      } else {
        // User is not owner - no backup needed, just update and delete
        console.log("User is not owner, proceeding with update without backup...");
        
        const transactParams = {
          TransactItems: [
            {
              // Update user's shop_id and role
              Update: {
                TableName: "Users",
                Key: {
                  user_id: { S: toUserId(email) }
                },
                UpdateExpression: "SET shop_id = :newShopId, #role = :newRole",
                ExpressionAttributeNames: {
                  "#role": "role"
                },
                ExpressionAttributeValues: {
                  ":newShopId": { S: shop_id },
                  ":newRole": { S: invitation.role.S }
                }
              }
            },
            {
              // Delete invitation
              Delete: {
                TableName: "invitedUser",
                Key: {
                  shop_id: { S: shop_id },
                  email: { S: email }
                }
              }
            }
          ]
        };
        
        console.log("Executing transaction for non-owner user...");
        await client.send(new TransactWriteItemsCommand(transactParams));
        console.log("Transaction completed successfully");
        
        res.status(200).json(createSuccessResponse("Invitation accepted - user updated", {
          email: email,
          shop_id: shop_id,
          old_shop_id: oldShopId,
          action: "updated_non_owner_user",
          backed_up: false,
          message: "User updated to new shop (no backup needed as user was not owner)"
        }));
      }
      
    } else {
      // 3b. User doesn't exist - throw error
      console.log("User does not exist for email:", email);
      throw createNotFoundError("User not found. Please ensure you have an existing account before accepting invitations.");
    }
    
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error accepting invitation:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId
    });
    throw createDatabaseError("accept invitation", error, "exports.acceptInvitation");
  }
});

export const rejectInvitation = asyncHandler(async (req, res, next) => {
  const { email, shop_id } = req.body;
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  if (!email || !shop_id) {
    throw createValidationError("Email and shop_id are required");
  }

  // Validate email format
  console.log("Received email:", email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log("Email validation failed for:", email);
    throw createValidationError("Invalid email format");
  }

  try {
    // Check if invitation exists first
    const checkParams = {
      TableName: "invitedUser",
      Key: {
        shop_id: { S: shop_id },
        email: { S: email }
      }
    };
    
    const { Item } = await client.send(new GetItemCommand(checkParams));
    if (!Item) {
      throw createNotFoundError("Invitation");
    }

    // Update the existing invitation with rejected status
    const updateParams = {
      TableName: "invitedUser",
      Key: {
        shop_id: { S: shop_id },
        email: { S: email }
      },
      UpdateExpression: "SET #status = :status, rejected_at = :rejectedAt",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":status": { S: "rejected" },
        ":rejectedAt": { S: new Date().toISOString() }
      },
      ReturnValues: "ALL_NEW"
    };

    const result = await client.send(new UpdateItemCommand(updateParams));
    
    res.status(200).json(createSuccessResponse("Invitation rejected successfully", {
      email: email,
      shop_id: shop_id,
      status: "rejected",
      rejected_at: new Date().toISOString()
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error rejecting invitation:", error);
    throw createDatabaseError("reject invitation", error, "exports.rejectInvitation");
  }
});

export const deleteInvitedUser = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  if (!email) {
    throw createValidationError("Email is required");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createValidationError("Invalid email format");
  }

  try {
    // First check if the invited user exists
    const checkParams = {
      TableName: "invitedUser",
      Key: {
        email: { S: email },
        shop_id: { S: userData.shop_id }
      }
    };
    
    const { Item } = await client.send(new GetItemCommand(checkParams));
    if (!Item) {
      throw createNotFoundError("Invited user");
    }

    // Delete the invited user
    const deleteParams = {
      TableName: "invitedUser",
      Key: {
        email: { S: email },
        shop_id: { S: userData.shop_id }
      }
    };

    await client.send(new DeleteItemCommand(deleteParams));
    
    // Decrement NumberOfUsers in Shops table after successful deletion
    try {
      const updateParams = {
        TableName: "Shops",
        Key: {
          shop_id: { S: userData.shop_id }
        },
        UpdateExpression: "SET NumberOfUsers = NumberOfUsers - :decrement",
        ExpressionAttributeValues: {
          ":decrement": { N: "1" }
        }
      };
      
      await client.send(new UpdateItemCommand(updateParams));
      console.log("NumberOfUsers decremented successfully after invitation deletion");
    } catch (updateError) {
      console.error("Error decrementing NumberOfUsers:", updateError);
      // Don't fail the whole request if this fails, just log it
    }
    
    res.status(200).json(createSuccessResponse("Invited user deleted successfully", {
      email: email,
      shop_id: userData.shop_id
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error deleting invited user:", error);
    throw createDatabaseError("delete invited user", error, "exports.deleteInvitedUser");
  }
});

export const updateUserRole = asyncHandler(async (req, res, next) => {
  const { email, role } = req.body;
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  if (!email) {
    throw createValidationError("Email is required");
  }

  if (!role) {
    throw createValidationError("Role is required");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createValidationError("Invalid email format");
  }

  // Check if requester is owner
  if (userData.role?.toLowerCase() !== "owner") {
    throw createAuthError("Only shop owners can change user roles");
  }

  // Prevent changing own role
  if (userData.user_id === email || userData.user_id?.toLowerCase() === email.toLowerCase()) {
    throw createValidationError("Cannot change your own role");
  }

  try {
    // Check if the user exists and is part of the shop
    const userCheckParams = {
      TableName: "Users",
      Key: {
        user_id: { S: toUserId(email) }
      }
    };
    
    const { Item: userItem } = await client.send(new GetItemCommand(userCheckParams));
    if (!userItem) {
      throw createNotFoundError("User");
    }

    // Check if user is part of the same shop
    const userShopId = userItem.shop_id?.S;
    if (!userShopId || userShopId !== userData.shop_id) {
      throw createValidationError("User is not part of this shop");
    }

    const currentRole = userItem.role?.S;
    const newRole = role;

    // Prevent changing owner's role to non-owner if they are the last owner
    if (currentRole?.toLowerCase() === "owner" && newRole.toLowerCase() !== "owner") {
      // Check if there are other owners in the shop
      const ownerCheckParams = {
        TableName: "Users",
        IndexName: "shop_id-index",
        KeyConditionExpression: "shop_id = :shopId",
        FilterExpression: "#role = :ownerRole AND user_id <> :userId",
        ExpressionAttributeNames: {
          "#role": "role"
        },
        ExpressionAttributeValues: {
          ":shopId": { S: userData.shop_id },
          ":ownerRole": { S: "Owner" },
          ":userId": { S: toUserId(email) }
        },
        Select: "COUNT"
      };
      
      const { Count: otherOwnerCount } = await client.send(new QueryCommand(ownerCheckParams));
      
      if (otherOwnerCount === 0) {
        throw createValidationError("Cannot change the last owner's role to a non-owner role. There must be at least one owner in the shop.");
      }
    }

    // Update the user's role
    const updateParams = {
      TableName: "Users",
      Key: {
        user_id: { S: toUserId(email) }
      },
      UpdateExpression: "SET #role = :newRole",
      ExpressionAttributeNames: {
        "#role": "role"
      },
      ExpressionAttributeValues: {
        ":newRole": { S: newRole }
      },
      ReturnValues: "ALL_NEW"
    };

    const result = await client.send(new UpdateItemCommand(updateParams));
    
    // Clean the response data
    let cleanedData = {};
    if (result.Attributes) {
      for (let key in result.Attributes) {
        if (typeof result.Attributes[key] === "object" && result.Attributes[key].S !== undefined) {
          cleanedData[key] = result.Attributes[key].S;
        } else {
          cleanedData[key] = result.Attributes[key];
        }
      }
    }
    
    res.status(200).json(createSuccessResponse("User role updated successfully", {
      email: email,
      old_role: currentRole,
      new_role: newRole,
      shop_id: userData.shop_id,
      updated_user: cleanedData
    }));

    await recordActivity(req, { action: 'user.role_change', entityType: 'user', entityId: email, detail: { email, from: currentRole, to: newRole } });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error updating user role:", error);
    throw createDatabaseError("update user role", error, "exports.updateUserRole");
  }
});

export const deleteUserFromShop = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  if (!email) {
    throw createValidationError("Email is required");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createValidationError("Invalid email format");
  }

  // Check if requester is owner
  if (userData.role?.toLowerCase() !== "owner") {
    throw createAuthError("Only shop owners can delete users from the shop");
  }

  // Prevent deleting self
  if (userData.user_id === email || userData.user_id?.toLowerCase() === email.toLowerCase()) {
    throw createValidationError("Cannot delete yourself from the shop");
  }

  try {
    // Check if the user exists and is part of the shop
    const userCheckParams = {
      TableName: "Users",
      Key: {
        user_id: { S: toUserId(email) }
      }
    };
    
    const { Item: userItem } = await client.send(new GetItemCommand(userCheckParams));
    if (!userItem) {
      throw createNotFoundError("User");
    }

    // Check if user is part of the same shop
    const userShopId = userItem.shop_id?.S;
    if (!userShopId || userShopId !== userData.shop_id) {
      throw createValidationError("User is not part of this shop");
    }

    const userRole = userItem.role?.S;
    const isUserOwner = userRole?.toLowerCase() === "owner";

    // Check if user is owner - prevent deleting last owner
    if (isUserOwner) {
      // Check if there are other owners in the shop
      const ownerCheckParams = {
        TableName: "Users",
        IndexName: "shop_id-index",
        KeyConditionExpression: "shop_id = :shopId",
        FilterExpression: "#role = :ownerRole AND user_id <> :userId",
        ExpressionAttributeNames: {
          "#role": "role"
        },
        ExpressionAttributeValues: {
          ":shopId": { S: userData.shop_id },
          ":ownerRole": { S: "Owner" },
          ":userId": { S: toUserId(email) }
        },
        Select: "COUNT"
      };
      
      const { Count: otherOwnerCount } = await client.send(new QueryCommand(ownerCheckParams));
      
      if (otherOwnerCount === 0) {
        throw createValidationError("Cannot delete the last owner in the shop. There must be at least one owner.");
      }
    }

    // Delete the user from Users table
    const deleteParams = {
      TableName: "Users",
      Key: {
        user_id: { S: toUserId(email) }
      }
    };

    await client.send(new DeleteItemCommand(deleteParams));
    
    // Decrement NumberOfUsers in Shops table after successful deletion
    try {
      const updateParams = {
        TableName: "Shops",
        Key: {
          shop_id: { S: userData.shop_id }
        },
        UpdateExpression: "SET NumberOfUsers = NumberOfUsers - :decrement",
        ExpressionAttributeValues: {
          ":decrement": { N: "1" }
        }
      };
      
      await client.send(new UpdateItemCommand(updateParams));
      console.log("NumberOfUsers decremented successfully after user deletion");
    } catch (updateError) {
      console.error("Error decrementing NumberOfUsers:", updateError);
      // Don't fail the whole request if this fails, just log it
    }
    
    res.status(200).json(createSuccessResponse("User deleted from shop successfully", {
      email: email,
      shop_id: userData.shop_id,
      deleted_role: userRole
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error deleting user from shop:", error);
    throw createDatabaseError("delete user from shop", error, "exports.deleteUserFromShop");
  }
});

export const refreshUserCookie = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  if (!userData.user_id) {
    throw createValidationError("Invalid user data in cookie");
  }

  try {
    // Get latest user data from database
    const userParams = {
      TableName: 'Users',
      Key: {
        user_id: { S: toUserId(userData.user_id) }
      }
    };
    
    const command = new GetItemCommand(userParams);
    const response = await client.send(command);
    
    if (!response.Item) {
      throw createNotFoundError("User");
    }

    const unmarshalledItem = unmarshall(response.Item);
    const { user_id, role, shop_id } = unmarshalledItem;

    // Update cookies with latest data
    res.cookie('userDataHTTP', JSON.stringify({ user_id, role, shop_id }), getCookieOptions({
      httpOnly: true,
      maxAge: 3600 * 1000, // 1 hour - same as accessToken
    }));

    res.cookie('userDataNonHTTP', JSON.stringify({ user_id, role, shop_id }), getCookieOptions({
      httpOnly: false,
      maxAge: 3600 * 1000, // 1 hour - same as accessToken
    }));
    
    res.status(200).json(createSuccessResponse("User cookie refreshed successfully", {
      user_id,
      role,
      shop_id
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error refreshing user cookie:", error);
    throw createDatabaseError("refresh user cookie", error, "exports.refreshUserCookie");
  }
});

export const getShopSubscriptionStatus = asyncHandler(async (req, res, next) => {
  const shop_id_cookie = req.cookies.userDataHTTP;
  
  if (!shop_id_cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(shop_id_cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }
  
  try {
    const params = {
      TableName: "Shops",
      Key: {
        shop_id: { S: userData.shop_id }
      },
      ProjectionExpression: "lookup_key, SubscriptionStatus"
    };
    
    const command = new GetItemCommand(params);
    const response = await client.send(command);
    
    if (!response.Item) {
      throw createNotFoundError("Shop not found");
    }
    
    const item = unmarshall(response.Item);
    res.status(200).json(createSuccessResponse("Shop subscription status retrieved successfully", {
      lookup_key: item.lookup_key,
      StripeCustomerSubscriptionStatus: item.SubscriptionStatus
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error retrieving shop subscription status:", error);
    throw createDatabaseError("retrieve shop subscription status", error, "exports.getShopSubscriptionStatus");
  }
});

export const PostReward = [
  async (req, res, next) => {
    // 1. Get shop_id from cookie
    const shop_id_cookie = req.cookies.userDataHTTP;
    if (!shop_id_cookie) {
      return res.status(400).json({ message: "Missing userDataHTTP cookie" });
    }
    let userData;
    try {
      userData = JSON.parse(shop_id_cookie);
    } catch (error) {
      return res.status(400).json({ message: "Invalid cookie data" });
    }

    // 2. Validate required fields
    const { rewardName, description } = req.body;
    
    if (!rewardName || typeof rewardName !== 'string' || rewardName.trim() === '') {
      return res.status(400).json({ message: "rewardName is required and cannot be empty" });
    }
    
    if (!description || typeof description !== 'string' || description.trim() === '') {
      return res.status(400).json({ message: "description is required and cannot be empty" });
    }

    // 3. Generate unique reward_id
    const reward_id = uuidv4();

    // 4. Upload image to S3
    let rewardImageKey = '';
    if (req.file) {
      // Get file extension
      const ext = req.file.originalname.split('.').pop();
      const fileKey = `${userData.shop_id}/${reward_id}.${ext}`;
      const uploadParams = {
        Bucket: 'collbine-forbusiness-reward-images',
        Key: fileKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };
      await s3.send(new PutObjectCommand(uploadParams));
      // Store full S3 URL instead of just the key
      rewardImageKey = s3PublicUrl(REWARD_IMAGES_BUCKET, fileKey);
    }

    // 5. Prepare DynamoDB item
    const item = {
      shop_id: { S: userData.shop_id },
      reward_id: { S: reward_id },
      rewardType: { S: req.body.rewardType || '' },
      rewardName: { S: req.body.rewardName || '' },
      description: { S: req.body.description || '' },
      rewardImage: { S: rewardImageKey },
      expiryType: { S: req.body.expiryType || '' },
      customRewardId: { S: req.body.customRewardId || '' },
      rewardTags: { S: req.body.rewardTags || '' },
      termsAndConditions: { S: req.body.termsAndConditions || '' },
      isCheck:{ BOOL: req.body.isCheck === "true" || req.body.isCheck === true || false},
      isPublished:{ BOOL: req.body.isPublished === "true" || req.body.isPublished === true || false},
      isArchieve: { BOOL: false },
    };
    // Only add expiryNumberOfDays if it's a valid number
    if (
      req.body.expiryNumberOfDays !== undefined &&
      req.body.expiryNumberOfDays !== null &&
      req.body.expiryNumberOfDays !== '' &&
      !isNaN(Number(req.body.expiryNumberOfDays))
    ) {
      item.expiryNumberOfDays = { N: String(req.body.expiryNumberOfDays) };
    }
    const params = {
      TableName: 'Rewards',
      Item: item
    };

    // 6. Save to DynamoDB
    try {
      await client.send(new PutItemCommand(params));
      res.status(201).json({ message: 'Reward created', reward_id, rewardImageKey });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Failed to create reward', error: error.message });
    }
  }
];

export const deleteReward = asyncHandler(async (req, res, next) => {
  // 1. Get shop_id from cookie
  const shop_id_cookie = req.cookies.userDataHTTP;
  if (!shop_id_cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(shop_id_cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  // 2. Get reward_id from body or params
  const reward_id = req.body.reward_id || req.params.reward_id;
  if (!reward_id) {
    throw createValidationError("Missing reward_id");
  }

  // 3. Fetch the reward item to get the image URL
  let rewardItem;
  try {
    const getParams = {
      TableName: 'Rewards',
      Key: {
        shop_id: { S: userData.shop_id },
        reward_id: { S: reward_id }
      }
    };
    const { Item } = await client.send(new GetItemCommand(getParams));
    if (!Item) {
      throw createNotFoundError("Reward");
    }
    rewardItem = Item;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw createDatabaseError("fetch reward", error, "exports.deleteReward");
  }

  // 4. Delete the reward from DynamoDB
  try {
    const deleteParams = {
      TableName: 'Rewards',
      Key: {
        shop_id: { S: userData.shop_id },
        reward_id: { S: reward_id }
      }
    };
    await client.send(new DeleteItemCommand(deleteParams));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw createDatabaseError("delete reward from database", error, "exports.deleteReward");
  }

  // 5. Delete the image from S3 (if exists)
  try {
    const rewardImageKey = rewardItem.rewardImage?.S;
    if (rewardImageKey && rewardImageKey.trim() !== '') {
      // Extract key from URL if it's a full URL, otherwise use as-is
      let imageKey = rewardImageKey;
      if (imageKey.startsWith('https://')) {
        // Extract key from full URL: https://bucket.s3.region.amazonaws.com/key
        const urlParts = imageKey.split('.amazonaws.com/');
        imageKey = urlParts.length > 1 ? urlParts[1] : imageKey;
      }
      const s3Params = {
        Bucket: 'collbine-forbusiness-reward-images',
        Key: imageKey
      };
      await s3.send(new DeleteObjectCommand(s3Params));
    }
  } catch (error) {
    // Log but don't fail the whole request if image deletion fails
    console.error('Failed to delete image from S3:', error);
  }

  res.status(200).json(createSuccessResponse("Reward deleted successfully"));
});

// Archive reward: set isArchieve = true. Fails if reward is in use (rewardChances or cardStepDetails).
export const archiveReward = asyncHandler(async (req, res, next) => {
  const shop_id_cookie = req.cookies.userDataHTTP;
  if (!shop_id_cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  let userData;
  try {
    userData = JSON.parse(shop_id_cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }
  // shop_id must come from cookie only (never from body or query)
  const shop_id = userData.shop_id;
  if (!shop_id) {
    throw createValidationError("shop_id not found in cookie");
  }
  const reward_id = req.body.reward_id || req.params.reward_id;
  if (!reward_id) {
    throw createValidationError("Missing reward_id");
  }

  // Check reward exists (Rewards table: primary key shop_id, sort key reward_id)
  const { Item: existingReward } = await client.send(new GetItemCommand({
    TableName: 'Rewards',
    Key: {
      shop_id: { S: shop_id },
      reward_id: { S: reward_id },
    },
  }));
  if (!existingReward) {
    throw createNotFoundError('Reward');
  }

  const isRewardIdInRewardChances = (rewardChances, targetId) => {
    if (!rewardChances) return false;
    let arr = rewardChances;
    if (typeof arr === 'string') {
      try {
        arr = JSON.parse(arr);
      } catch (e) {
        return false;
      }
    }
    if (!Array.isArray(arr)) arr = [arr];
    return arr.some((item) => item && (item.rewardId === targetId || item.reward_id === targetId));
  };

  const isRewardIdInCardStepDetails = (cardStepDetails, targetId) => {
    if (!cardStepDetails) return false;
    let steps = cardStepDetails;
    if (typeof steps === 'string') {
      try {
        steps = JSON.parse(steps);
      } catch (e) {
        return false;
      }
    }
    if (!Array.isArray(steps)) return false;
    return steps.some((step) => step && step.reward && (step.reward.id === targetId || step.reward.reward_id === targetId));
  };

  // 1. Check DynamoDB qr_configuration -> rewardChances
  try {
    const { Item: qrItem } = await client.send(new GetItemCommand({
      TableName: 'qr_configuration',
      Key: { shop_id: { S: shop_id } },
      ProjectionExpression: 'rewardChances',
    }));
    if (qrItem && qrItem.rewardChances && qrItem.rewardChances.S) {
      if (isRewardIdInRewardChances(qrItem.rewardChances.S, reward_id)) {
        return res.status(400).json({
          error: 'Unable to archive because reward is in use',
          details: 'Reward is referenced in QR configuration (rewardChances).',
        });
      }
    }
  } catch (err) {
    console.error('Error checking qr_configuration:', err);
    throw createDatabaseError('check qr_configuration', err, 'exports.archiveReward');
  }

  // 2. Check DynamoDB StampData -> cardStepDetails
  try {
    const { Item: stampItem } = await client.send(new GetItemCommand({
      TableName: 'StampData',
      Key: { shop_id: { S: shop_id } },
      ProjectionExpression: 'cardStepDetails',
    }));
    if (stampItem && stampItem.cardStepDetails && stampItem.cardStepDetails.S) {
      if (isRewardIdInCardStepDetails(stampItem.cardStepDetails.S, reward_id)) {
        return res.status(400).json({
          error: 'Unable to archive because reward is in use',
          details: 'Reward is referenced in stamp card step details.',
        });
      }
    }
  } catch (err) {
    console.error('Error checking StampData:', err);
    throw createDatabaseError('check StampData', err, 'exports.archiveReward');
  }

  // 3. Check Supabase live_shop_details -> StampData -> cardStepDetails
  if (supabase) {
    try {
      const { data: liveRow, error: liveError } = await supabase
        .from('live_shop_details')
        .select('StampData')
        .eq('shop_id', shop_id)
        .maybeSingle();
      if (!liveError && liveRow && liveRow.StampData) {
        let stampData = liveRow.StampData;
        if (typeof stampData === 'string') {
          try {
            stampData = JSON.parse(stampData);
          } catch (e) {
            stampData = null;
          }
        }
        const firstCard = Array.isArray(stampData) && stampData.length > 0 ? stampData[0] : stampData;
        const cardStepDetails = firstCard && (firstCard.cardStepDetails != null ? firstCard.cardStepDetails : firstCard.card_step_details);
        if (isRewardIdInCardStepDetails(cardStepDetails, reward_id)) {
          return res.status(400).json({
            error: 'Unable to archive because reward is in use',
            details: 'Reward is referenced in live shop stamp card step details.',
          });
        }
      }
    } catch (err) {
      console.error('Error checking live_shop_details StampData:', err);
      throw createDatabaseError('check live_shop_details StampData', err, 'exports.archiveReward');
    }

    // 4. Check Supabase live_shop_details -> qr_configuration -> rewardChances
    try {
      const { data: liveRow, error: liveError } = await supabase
        .from('live_shop_details')
        .select('qr_configuration')
        .eq('shop_id', shop_id)
        .maybeSingle();
      if (!liveError && liveRow && liveRow.qr_configuration != null) {
        let qrConfig = liveRow.qr_configuration;
        if (typeof qrConfig === 'string') {
          try {
            qrConfig = JSON.parse(qrConfig);
          } catch (e) {
            qrConfig = null;
          }
        }
        const configs = Array.isArray(qrConfig) ? qrConfig : (qrConfig ? [qrConfig] : []);
        for (const config of configs) {
          const chances = config && (config.rewardChances != null ? config.rewardChances : config.reward_chances);
          if (isRewardIdInRewardChances(chances, reward_id)) {
            return res.status(400).json({
              error: 'Unable to archive because reward is in use',
              details: 'Reward is referenced in live shop QR configuration (rewardChances).',
            });
          }
        }
      }
    } catch (err) {
      console.error('Error checking live_shop_details qr_configuration:', err);
      throw createDatabaseError('check live_shop_details qr_configuration', err, 'exports.archiveReward');
    }
  }

  // 5. Update isArchieve to true (reward already verified to exist above)
  await client.send(new UpdateItemCommand({
    TableName: 'Rewards',
    Key: {
      shop_id: { S: shop_id },
      reward_id: { S: reward_id },
    },
    UpdateExpression: 'SET isArchieve = :val',
    ExpressionAttributeValues: { ':val': { BOOL: true } },
  }));

  res.status(200).json(createSuccessResponse('Reward archived successfully'));
});

export const updateReward = asyncHandler(async (req, res, next) => {
  // 1. Get shop_id from cookie
  const shop_id_cookie = req.cookies.userDataHTTP;
  if (!shop_id_cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(shop_id_cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  // 2. Get reward_id from body or params
  const reward_id = req.body.reward_id || req.params.reward_id;
  if (!reward_id) {
    throw createValidationError("Missing reward_id");
  }

  // 3. Get the fields to update from request body
  const updateFields = req.body;
  
  // Check for image deletion flag
  const isRewardImageDeleted = updateFields.isRewardImageDeleted === 'true';
  
  // Validate that at least one field is provided
  if (!updateFields || Object.keys(updateFields).length === 0) {
    throw createValidationError("At least one field must be provided for update");
  }

  console.log("📝 Reward update fields:", updateFields);

  // 4. Check if reward exists
  let existingReward;
  try {
    const getParams = {
      TableName: 'Rewards',
      Key: {
        shop_id: { S: userData.shop_id },
        reward_id: { S: reward_id }
      }
    };
    const { Item } = await client.send(new GetItemCommand(getParams));
    if (!Item) {
      throw createNotFoundError("Reward");
    }
    existingReward = Item;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw createDatabaseError("fetch reward", error, "exports.updateReward");
  }

  // 5. Handle image upload if provided
  let rewardImageKey = existingReward.rewardImage?.S || '';
  if (req.file) {
    try {
      // Delete old image if exists
      if (rewardImageKey && rewardImageKey.trim() !== '') {
        const deleteParams = {
          Bucket: 'collbine-forbusiness-reward-images',
          Key: rewardImageKey
        };
        try {
          await s3.send(new DeleteObjectCommand(deleteParams));
        } catch (deleteError) {
          console.error('Failed to delete old image:', deleteError);
          // Continue with upload even if deletion fails
        }
      }

      // Upload new image
      const ext = req.file.originalname.split('.').pop();
      const fileKey = `${userData.shop_id}/${reward_id}.${ext}`;
      const uploadParams = {
        Bucket: 'collbine-forbusiness-reward-images',
        Key: fileKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };
      await s3.send(new PutObjectCommand(uploadParams));
      // Store full S3 URL instead of just the key
      rewardImageKey = s3PublicUrl(REWARD_IMAGES_BUCKET, fileKey);
    } catch (error) {
      throw createExternalServiceError("AWS S3", "upload reward image", error, "exports.updateReward");
    }
  }

  // 6. Build the update expression dynamically
  let updateExpression = "SET ";
  let expressionAttributeNames = {};
  let expressionAttributeValues = {};
  
  const allowedFields = [
    'rewardType', 'rewardName', 'description', 'expiryType', 
    'customRewardId', 'rewardTags', 'termsAndConditions', 'isCheck', 'isPublished'
  ];
  
  let setParts = [];
  let index = 0;

  // Handle text fields
  Object.keys(updateFields).forEach((field) => {
    if (allowedFields.includes(field)) {
      const placeholder = `:val${index}`;
      const namePlaceholder = `#${field}`;
      
      setParts.push(`#${field} = ${placeholder}`);
      expressionAttributeNames[namePlaceholder] = field;
      
      if (field === 'isCheck' || field === 'isPublished') {
        // Handle boolean fields
        expressionAttributeValues[placeholder] = { BOOL: updateFields[field] === "true" || updateFields[field] === true };
      } else {
        // Handle string fields
        expressionAttributeValues[placeholder] = { S: updateFields[field] };
      }
      index++;
    }
  });

  // Handle image field if uploaded or deleted
  if (req.file) {
    const placeholder = `:val${index}`;
    setParts.push(`#rewardImage = ${placeholder}`);
    expressionAttributeNames['#rewardImage'] = 'rewardImage';
    expressionAttributeValues[placeholder] = { S: rewardImageKey };
    index++;
  } else if (isRewardImageDeleted) {
    // User wants to delete reward image - delete from S3 and set to empty
    try {
      const existingImageKey = existingReward.rewardImage?.S;
      if (existingImageKey && existingImageKey.trim() !== '') {
        await s3.send(new DeleteObjectCommand({
          Bucket: 'collbine-forbusiness-reward-images',
          Key: existingImageKey
        }));
        console.log(`🗑️ Deleted reward image from S3: ${existingImageKey}`);
      }
    } catch (s3Error) {
      console.error("Error deleting reward image from S3:", s3Error);
      // Continue with database update even if S3 deletion fails
    }
    
    setParts.push(`#rewardImage = :emptyString`);
    expressionAttributeNames['#rewardImage'] = 'rewardImage';
    expressionAttributeValues[':emptyString'] = { S: "" };
  }

  // Handle expiryNumberOfDays if provided
  if (updateFields.expiryNumberOfDays !== undefined && 
      updateFields.expiryNumberOfDays !== null && 
      updateFields.expiryNumberOfDays !== '' && 
      !isNaN(Number(updateFields.expiryNumberOfDays))) {
    const placeholder = `:val${index}`;
    setParts.push(`#expiryNumberOfDays = ${placeholder}`);
    expressionAttributeNames['#expiryNumberOfDays'] = 'expiryNumberOfDays';
    expressionAttributeValues[placeholder] = { N: String(updateFields.expiryNumberOfDays) };
    index++;
  }
  
  if (setParts.length === 0) {
    throw createValidationError("No valid fields provided for update");
  }
  
  updateExpression += setParts.join(", ");

  const params = {
    TableName: "Rewards",
    Key: {
      shop_id: { S: userData.shop_id },
      reward_id: { S: reward_id }
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW"
  };

  try {
    const result = await client.send(new UpdateItemCommand(params));
    
    // Clean the returned data
    let cleanedData = {};
    if (result.Attributes) {
      for (let key in result.Attributes) {
        if (typeof result.Attributes[key] === "object" && result.Attributes[key].S !== undefined) {
          cleanedData[key] = result.Attributes[key].S;
        } else if (typeof result.Attributes[key] === "object" && result.Attributes[key].BOOL !== undefined) {
          cleanedData[key] = result.Attributes[key].BOOL;
        } else if (typeof result.Attributes[key] === "object" && result.Attributes[key].N !== undefined) {
          cleanedData[key] = Number(result.Attributes[key].N);
        } else {
          cleanedData[key] = result.Attributes[key];
        }
      }
    }
    
    // Update cardStepDetails in StampData if this reward is referenced
    try {
      const stampParams = {
        TableName: 'StampData',
        Key: {
          shop_id: { S: userData.shop_id }
        }
      };
      
      const { Item: stampItem } = await client.send(new GetItemCommand(stampParams));
      
      if (stampItem && stampItem.cardStepDetails) {
        // Parse the cardStepDetails JSON string
        let cardStepDetails = JSON.parse(stampItem.cardStepDetails.S);
        let updated = false;
        
        // Check each step for the reward_id and update asynchronously
        cardStepDetails = await Promise.all(cardStepDetails.map(async (step) => {
          if (step.reward && step.reward.id === reward_id) {
            updated = true;
            
            // Update the reward object with the latest data from cleanedData
            // cleanedData contains all fields from the updated reward (ReturnValues: "ALL_NEW")
            // If a field doesn't exist in cleanedData (edge case), use empty string to sync with reward data
            const updatedReward = {
              id: reward_id,
              type: cleanedData.rewardType ?? "stampReward",
              name: cleanedData.rewardName ?? "",
              description: cleanedData.description ?? "",
              expiry: cleanedData.expiryNumberOfDays ? String(cleanedData.expiryNumberOfDays) : "",
              custom_id: cleanedData.customRewardId ?? "",
              tags: cleanedData.rewardTags ?? "",
              isCheck: cleanedData.isCheck ?? false,
              isPublished: cleanedData.isPublished ?? false,
            };
            
            // Handle image URL - use rewardImageKey (most current) or cleanedData or existing
            const currentImageKey = rewardImageKey || cleanedData.rewardImage || existingReward.rewardImage?.S || '';
            if (currentImageKey && currentImageKey.trim() !== '') {
              try {
                // Extract key from URL if it's a full URL, otherwise use as-is
                let imageKey = currentImageKey;
                if (imageKey.startsWith('https://')) {
                  // Extract key from full URL: https://bucket.s3.region.amazonaws.com/key
                  const urlParts = imageKey.split('.amazonaws.com/');
                  imageKey = urlParts.length > 1 ? urlParts[1] : imageKey;
                }
                const imageCommand = new GetObjectCommand({
                  Bucket: 'collbine-forbusiness-reward-images',
                  Key: imageKey
                });
                const imageUrl = await getSignedUrl(getS3(), imageCommand, { expiresIn: 1800 });
                updatedReward.image = { url: imageUrl };
              } catch (imageError) {
                console.error('Error generating presigned URL for reward image in cardStepDetails:', imageError);
                // Keep existing image URL if available, otherwise use placeholder
                updatedReward.image = step.reward.image || { url: "/images/placeholder/reward_placeholder.png" };
              }
            } else {
              // If image was deleted or doesn't exist, use placeholder
              updatedReward.image = { url: "/images/placeholder/reward_placeholder.png" };
            }
            
            return {
              ...step,
              reward: updatedReward
            };
          }
          return step;
        }));
        
        // If any step was updated, save back to StampData
        if (updated) {
          const updateStampParams = {
            TableName: "StampData",
            Key: {
              shop_id: { S: userData.shop_id }
            },
            UpdateExpression: "SET cardStepDetails = :cardStepDetails",
            ExpressionAttributeValues: {
              ":cardStepDetails": { S: JSON.stringify(cardStepDetails) }
            }
          };
          
          await client.send(new UpdateItemCommand(updateStampParams));
          console.log(`✅ Updated cardStepDetails in StampData for reward_id: ${reward_id}`);
        }
      }
    } catch (stampError) {
      // Log error but don't fail the reward update
      console.error("Error updating cardStepDetails in StampData:", stampError);
    }
    
    res.status(200).json(createSuccessResponse("Reward updated successfully", cleanedData));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error updating reward:", error);
    throw createDatabaseError("update reward", error, "exports.updateReward");
  }
});

export const getRewards = asyncHandler(async (req, res, next) => {
  const shop_id_cookie = req.cookies.userDataHTTP;
  
  if (!shop_id_cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(shop_id_cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }
  
  try {
    const reward_type = req.query.reward_type || req.query.rewardType;
    const params = {
      TableName: "Rewards",
      KeyConditionExpression: "shop_id = :shopId",
      ExpressionAttributeValues: {
        ":shopId": { S: userData.shop_id },
        ":false": { BOOL: false },
      },
    };
    // Always filter out archived rewards (non-archived only)
    const nonArchivedFilter = " (attribute_not_exists(isArchieve) OR isArchieve = :false) ";
    if (reward_type !== undefined && reward_type !== null && String(reward_type).trim() !== "") {
      params.FilterExpression = "rewardType = :rewardType AND " + nonArchivedFilter.trim();
      params.ExpressionAttributeValues[":rewardType"] = { S: String(reward_type).trim() };
    } else {
      params.FilterExpression = nonArchivedFilter.trim();
    }

    const { Items } = await client.send(new QueryCommand(params));

    // Get live_in_used_stamp and live_in_used_scan from Supabase live_shop_details (StampData, qr_configuration)
    let live_in_used_stamp = [];
    let live_in_used_scan = [];
    if (supabase) {
      try {
        const { data: liveShopRow, error: liveShopError } = await supabase
          .from('live_shop_details')
          .select('StampData, qr_configuration')
          .eq('shop_id', userData.shop_id)
          .maybeSingle();
        if (!liveShopError && liveShopRow) {
          // --- StampData -> live_in_used_stamp (cardStepDetails) ---
          if (liveShopRow.StampData) {
            let stampData = liveShopRow.StampData;
            if (typeof stampData === 'string') {
              try {
                stampData = JSON.parse(stampData);
              } catch (parseErr) {
                console.error('Error parsing StampData JSON:', parseErr);
                stampData = null;
              }
            }
            const firstCard = Array.isArray(stampData) && stampData.length > 0 ? stampData[0] : stampData;
            const cardStepDetails = firstCard && (firstCard.cardStepDetails !== undefined && firstCard.cardStepDetails !== null ? firstCard.cardStepDetails : firstCard.card_step_details);
            if (cardStepDetails !== undefined && cardStepDetails !== null) {
              live_in_used_stamp = typeof cardStepDetails === 'string' ? JSON.parse(cardStepDetails) : cardStepDetails;
              if (!Array.isArray(live_in_used_stamp)) {
                live_in_used_stamp = [];
              }
            }
          }
          // --- qr_configuration -> live_in_used_scan ---
          if (liveShopRow.qr_configuration !== undefined && liveShopRow.qr_configuration !== null) {
            let qrConfig = liveShopRow.qr_configuration;
            if (typeof qrConfig === 'string') {
              try {
                qrConfig = JSON.parse(qrConfig);
              } catch (parseErr) {
                console.error('Error parsing qr_configuration JSON:', parseErr);
                qrConfig = null;
              }
            }
            if (Array.isArray(qrConfig)) {
              live_in_used_scan = qrConfig;
            } else if (qrConfig && typeof qrConfig === 'object') {
              live_in_used_scan = [qrConfig];
            }
          }
        }
      } catch (error) {
        console.error('Error retrieving live_shop_details StampData / qr_configuration:', error);
      }
    }

    if (!Items || Items.length === 0) {
      // Still fetch rewardChances from qr_configuration for consistent response shape
      let currently_scanReward = null;
      try {
        const qrParams = {
          TableName: 'qr_configuration',
          Key: { shop_id: { S: userData.shop_id } },
          ProjectionExpression: 'rewardChances'
        };
        const { Item: qrItem } = await client.send(new GetItemCommand(qrParams));
        if (qrItem && qrItem.rewardChances && qrItem.rewardChances.S !== undefined) {
          currently_scanReward = qrItem.rewardChances.S;
        }
      } catch (error) {
        console.error('Error retrieving qr_configuration rewardChances:', error);
      }
      const isEdit = !["pending", "scheduled_released_cancelled", "approved_scheduled"].includes(req.releaseStatus);
      const releaseStatus = req.releaseStatus || null;
      res.status(200).json(createSuccessResponse("No rewards found", {
        rewards: [],
        currently_stamp: null,
        live_in_used_stamp: live_in_used_stamp,
        live_in_used_scan: live_in_used_scan,
        currently_scanReward: currently_scanReward,
        isEdit,
        releaseStatus
      }));
      return;
    }

    // Data cleaning logic using unmarshall and generate presigned URLs
    let cleanedData = await Promise.all(Items.map(async (item) => {
      const reward = unmarshall(item);
      
      // Generate presigned URL for reward image if it exists
      if (reward.rewardImage && reward.rewardImage.trim() !== '') {
        try {
          // Extract key from URL if it's a full URL, otherwise use as-is
          let imageKey = reward.rewardImage;
          if (imageKey.startsWith('https://')) {
            // Extract key from full URL: https://bucket.s3.region.amazonaws.com/key
            const urlParts = imageKey.split('.amazonaws.com/');
            imageKey = urlParts.length > 1 ? urlParts[1] : imageKey;
          }
          const command = new GetObjectCommand({
            Bucket: 'collbine-forbusiness-reward-images',
            Key: imageKey
          });
          reward.rewardImage = await getSignedUrl(getS3(), command, { expiresIn: 1800 }); // 30 minutes expiry
        } catch (error) {
          console.error('Error generating presigned URL for reward image:', error);
          reward.rewardImage = ''; // Set to empty if presigned URL generation fails
        }
      }
      
      return reward;
    }));

    // Get cardStepDetails from stamp management
    let currently_stamp = null;
    try {
      const stampParams = {
        TableName: 'StampData',
        Key: {
          shop_id: { S: userData.shop_id }
        }
      };
      const { Item: stampItem } = await client.send(new GetItemCommand(stampParams));
      if (stampItem && stampItem.cardStepDetails) {
        // Parse the JSON string to object
        currently_stamp = JSON.parse(stampItem.cardStepDetails.S);
      }
    } catch (error) {
      console.error('Error retrieving stamp management data:', error);
    }

    // Get rewardChances from qr_configuration (exposed as currently_scanReward)
    let currently_scanReward = null;
    try {
      const qrParams = {
        TableName: 'qr_configuration',
        Key: {
          shop_id: { S: userData.shop_id }
        },
        ProjectionExpression: 'rewardChances'
      };
      const { Item: qrItem } = await client.send(new GetItemCommand(qrParams));
      if (qrItem && qrItem.rewardChances && qrItem.rewardChances.S !== undefined) {
        currently_scanReward = qrItem.rewardChances.S;
      }
    } catch (error) {
      console.error('Error retrieving qr_configuration rewardChances:', error);
    }

    const isEdit = !["pending", "scheduled_released_cancelled", "approved_scheduled"].includes(req.releaseStatus);
    const releaseStatus = req.releaseStatus || null;
    res.status(200).json(createSuccessResponse("Rewards retrieved successfully", {
      rewards: cleanedData,
      currently_stamp: currently_stamp,
      live_in_used_stamp: live_in_used_stamp,
      live_in_used_scan: live_in_used_scan,
      currently_scanReward: currently_scanReward,
      isEdit,
      releaseStatus
    }));
    
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error retrieving rewards:", error);
    throw createDatabaseError("retrieve rewards", error, "exports.getRewards");
  }
});

// Extract all reward IDs/names from rewardChances (from live_shop_details qr_configuration).
function getRewardIdsFromRewardChances(rewardChances) {
  if (rewardChances == null) return [];
  let arr = rewardChances;
  if (typeof arr === 'string') {
    try {
      arr = JSON.parse(arr);
    } catch (e) {
      return [];
    }
  }
  if (!Array.isArray(arr)) arr = arr ? [arr] : [];
  const ids = [];
  for (const item of arr) {
    if (!item) continue;
    const id = item.rewardId ?? item.reward_id ?? (typeof item === 'string' ? item : null);
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

// Fetch reward names from Rewards table for given reward_ids. Returns map reward_id -> rewardName (or reward_id if not found).
async function getRewardNamesForIds(shop_id, rewardIds) {
  if (!rewardIds || rewardIds.length === 0) return {};
  const uniq = [...new Set(rewardIds)];
  const results = await Promise.all(
    uniq.map((reward_id) =>
      client.send(new GetItemCommand({
        TableName: 'Rewards',
        Key: {
          shop_id: { S: shop_id },
          reward_id: { S: reward_id },
        },
        ProjectionExpression: 'rewardName',
      }))
    )
  );
  const idToName = {};
  uniq.forEach((reward_id, i) => {
    const item = results[i].Item;
    const name = item && item.rewardName && item.rewardName.S ? item.rewardName.S : reward_id;
    idToName[reward_id] = name;
  });
  return idToName;
}

export const getQrRewardDailyCounts = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;

  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }

  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  const shop_id = userData.shop_id;
  const date = req.query.date;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }); // YYYY-MM-DD in Singapore time

  try {
    if (date != null && String(date).trim() !== "") {
      const claim_date = String(date).trim();
      const params = {
        TableName: "qr_reward_daily_counts",
        Key: {
          shop_id: { S: shop_id },
          claim_date: { S: claim_date },
        },
      };
      const { Item } = await client.send(new GetItemCommand(params));
      const data = Item ? unmarshall(Item) : null;

      // When requesting today's date: merge with live_shop_details rewardChances so every configured reward has an entry (existing count or 0).
      // If no DynamoDB row exists yet for today, also create one with 0 counts for each configured reward.
      if (claim_date === today && supabase) {
        let rewardIds = [];
        try {
          const { data: liveRow, error: liveError } = await supabase
            .from('live_shop_details')
            .select('qr_configuration')
            .eq('shop_id', shop_id)
            .maybeSingle();
          if (!liveError && liveRow && liveRow.qr_configuration != null) {
            let qrConfig = liveRow.qr_configuration;
            if (typeof qrConfig === 'string') {
              try {
                qrConfig = JSON.parse(qrConfig);
              } catch (e) {
                qrConfig = null;
              }
            }
            const configs = Array.isArray(qrConfig) ? qrConfig : (qrConfig ? [qrConfig] : []);
            for (const config of configs) {
              const chances = config && (config.rewardChances != null ? config.rewardChances : config.reward_chances);
              rewardIds = [...new Set([...rewardIds, ...getRewardIdsFromRewardChances(chances)])];
            }
          }
        } catch (err) {
          console.error('Error fetching live_shop_details for rewardChances:', err);
        }

        const reserved = ['shop_id', 'claim_date'];
        const dataRewardIds = data != null ? Object.keys(data).filter((k) => !reserved.includes(k)) : [];
        const allRewardIds = [...new Set([...rewardIds, ...dataRewardIds])];
        const idToName = await getRewardNamesForIds(shop_id, allRewardIds);

        const result = {
          shop_id,
          claim_date,
        };
        const keyLabel = (id, name) => `${id}|${name}`;
        // Get count from data: key may be rewardId or "rewardId|rewardName"
        const getCount = (dataObj, rewardId) => {
          if (dataObj == null) return null;
          if (dataObj[rewardId] !== undefined && dataObj[rewardId] !== null) return dataObj[rewardId];
          const prefixed = Object.keys(dataObj).find((k) => k === rewardId || k.startsWith(rewardId + '|'));
          return prefixed != null ? dataObj[prefixed] : null;
        };
        for (const rewardId of rewardIds) {
          const name = idToName[rewardId] || rewardId;
          const label = keyLabel(rewardId, name);
          const count = getCount(data, rewardId);
          result[label] = count !== null && count !== undefined ? count : 0;
        }
        if (data != null) {
          for (const key of dataRewardIds) {
            const label = key.includes('|') ? key : keyLabel(key, idToName[key] || key);
            if (result[label] === undefined) result[label] = data[key];
          }
        }

        // If there was no existing row for today, create one with 0 counts for each configured reward.
        if (!Item && rewardIds.length > 0) {
          try {
            const putParams = {
              TableName: "qr_reward_daily_counts",
              Item: {
                shop_id: { S: shop_id },
                claim_date: { S: claim_date },
              },
            };
            for (const rewardId of rewardIds) {
              putParams.Item[rewardId] = { N: "0" };
            }
            await client.send(new PutItemCommand(putParams));
          } catch (putErr) {
            console.error("Failed to create zeroed qr_reward_daily_counts row for today:", putErr);
          }
        }

        res.status(200).json(createSuccessResponse("QR reward daily count retrieved", result));
        return;
      }

      if (!Item) {
        res.status(200).json(createSuccessResponse("No data found for this date", {
          shop_id,
          claim_date,
          data: null,
        }));
        return;
      }
      const reservedKeys = ['shop_id', 'claim_date'];
      const dateRewardIds = Object.keys(data).filter((k) => !reservedKeys.includes(k));
      const idToNameForDate = await getRewardNamesForIds(shop_id, dateRewardIds);
      const resultWithNames = { shop_id, claim_date };
      for (const rewardId of dateRewardIds) {
        const label = rewardId.includes('|') ? rewardId : `${rewardId}|${idToNameForDate[rewardId] || rewardId}`;
        resultWithNames[label] = data[rewardId];
      }
      res.status(200).json(createSuccessResponse("QR reward daily count retrieved", resultWithNames));
      return;
    }

    const params = {
      TableName: "qr_reward_daily_counts",
      KeyConditionExpression: "shop_id = :shopId",
      ExpressionAttributeValues: {
        ":shopId": { S: shop_id },
      },
    };
    const { Items } = await client.send(new QueryCommand(params));
    const rawItems = (Items || []).map((item) => unmarshall(item));
    const allIdsFromQuery = [...new Set(rawItems.flatMap((item) => Object.keys(item).filter((k) => k !== 'shop_id' && k !== 'claim_date')))];
    const idToNameQuery = await getRewardNamesForIds(shop_id, allIdsFromQuery);
    const countsWithNames = rawItems.map((item) => {
      const out = { shop_id: item.shop_id, claim_date: item.claim_date };
      for (const key of Object.keys(item)) {
        if (key === 'shop_id' || key === 'claim_date') continue;
        const label = key.includes('|') ? key : `${key}|${idToNameQuery[key] || key}`;
        out[label] = item[key];
      }
      return out;
    });
    res.status(200).json(createSuccessResponse("QR reward daily counts retrieved", {
      shop_id,
      counts: countsWithNames,
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error retrieving qr_reward_daily_counts:", error);
    throw createDatabaseError("retrieve qr_reward_daily_counts", error, "exports.getQrRewardDailyCounts");
  }
});

export const getChecklistStatus = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  const shop_id = userData.shop_id;

  try {
    // Fetch business, customer, Shops, Order_Settings, and Menus tables in parallel
    const [businessResult, customerResult, shopResult, orderSettingsResult, menuResult] = await Promise.all([
      client.send(new GetItemCommand({
        TableName: "businessinformations",
        Key: { shop_id: { S: shop_id } },
        ProjectionExpression: "hasAllRequiredField"
      })),
      client.send(new GetItemCommand({
        TableName: "CustomerFacingDetails",
        Key: { shop_id: { S: shop_id } },
        ProjectionExpression: "hasAllRequiredField"
      })),
      client.send(new GetItemCommand({
        TableName: "Shops",
        Key: { shop_id: { S: shop_id } },
        ProjectionExpression: "StripeConnectAccountId"
      })),
      client.send(new GetItemCommand({
        TableName: "Order_Settings",
        Key: { shopId: { S: shop_id } },
        ProjectionExpression: "bookingDaysAhead, defaultDailyQuota, hours, minNoticeHours, orderMode, updatedAt"
      })),
      client.send(new GetItemCommand({
        TableName: "Menus",
        Key: { shop_id: { S: shop_id } },
        ProjectionExpression: "menu"
      }))
    ]);

    let businessHasAllRequiredField = false;
    let customerHasAllRequiredField = false;

    if (businessResult.Item && businessResult.Item.hasAllRequiredField) {
      businessHasAllRequiredField = businessResult.Item.hasAllRequiredField.BOOL !== undefined
        ? businessResult.Item.hasAllRequiredField.BOOL
        : false;
    }

    if (customerResult.Item && customerResult.Item.hasAllRequiredField) {
      customerHasAllRequiredField = customerResult.Item.hasAllRequiredField.BOOL !== undefined
        ? customerResult.Item.hasAllRequiredField.BOOL
        : false;
    }

    let stripeConnectReady = false;
    const stripeAccountId = shopResult.Item?.StripeConnectAccountId?.S;
    if (stripeAccountId) {
      try {
        const stripeConnect = getConnectStripe();
        const account = await stripeConnect.accounts.retrieve(stripeAccountId);
        stripeConnectReady = account.details_submitted && account.charges_enabled;
      } catch {
        stripeConnectReady = false;
      }
    }

    const requiredOrderFields = ['bookingDaysAhead', 'defaultDailyQuota', 'hours', 'minNoticeHours', 'orderMode', 'updatedAt'];
    const orderSettingsReady = orderSettingsResult.Item
      ? requiredOrderFields.every(field => {
          const attr = orderSettingsResult.Item[field];
          if (!attr) return false;
          const value = attr.S ?? attr.N ?? attr.BOOL ?? attr.L ?? attr.M;
          if (value === undefined || value === null) return false;
          if (typeof value === 'string') return value.trim() !== '';
          if (Array.isArray(value)) return value.length > 0;
          return true;
        })
      : false;

    let menuSettingReady = false;
    if (menuResult.Item?.menu?.S) {
      try {
        const parsed = JSON.parse(menuResult.Item.menu.S);
        menuSettingReady = Array.isArray(parsed.items) && parsed.items.length > 0;
      } catch {
        menuSettingReady = false;
      }
    }

    const checklistStatus = {
      businessHasAllRequiredField,
      customerHasAllRequiredField,
      orderSettingsReady,
      menuSettingReady,
      stripeConnectReady
    };

    res.status(200).json(createSuccessResponse("Checklist status retrieved successfully", checklistStatus));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error retrieving checklist status:", error);
    throw createDatabaseError("retrieve checklist status", error, "exports.getChecklistStatus");
  }
});

export const sendForReview = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  // Ensure shop has an active paid subscription before allowing review submission.
  try {
    const subStatusResult = await client.send(new GetItemCommand({
      TableName: "Shops",
      Key: { shop_id: { S: userData.shop_id } },
      ProjectionExpression: "SubscriptionStatus",
    }));
    const subscriptionStatus = subStatusResult.Item?.SubscriptionStatus?.S || null;
    if (subscriptionStatus !== 'active') {
      // TODO: Uncomment this when we have a way to check if the shop has an active subscription
      // throw createValidationError("You must have an active subscription before submitting for review.");
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error checking subscription status before sendForReview:", error);
    throw createDatabaseError("check subscription status", error, "exports.sendForReview");
  }

  const {
    release_type,
    release_datetime,
    contact_details_name,
    contact_details_role,
    contact_details_phone_number,
    contact_details_email
  } = req.body;

  // Get email from cookie
  const userEmail = userData.user_id;

  if (!userEmail) {
    throw createValidationError("User email not found in cookie");
  }

  // Validate required fields
  if (!release_type) {
    throw createValidationError("release_type is required");
  }

  if (!contact_details_name) {
    throw createValidationError("contact_details_name is required");
  }

  if (!contact_details_role) {
    throw createValidationError("contact_details_role is required");
  }

  if (!contact_details_email) {
    throw createValidationError("contact_details_email is required");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(contact_details_email)) {
    throw createValidationError("Invalid contact_details_email format");
  }

  // Conditional validation: release_datetime required if release_type is "schedule"
  if (release_type.toLowerCase() === "schedule") {
    if (!release_datetime) {
      throw createValidationError("release_datetime is required when release_type is 'schedule'");
    }

    // Validate datetime format (ISO 8601 or similar)
    const datetime = new Date(release_datetime);
    if (isNaN(datetime.getTime())) {
      throw createValidationError("Invalid release_datetime format. Use ISO 8601 format (e.g., 2025-11-03T10:00:00Z)");
    }

    // Validate that datetime is in the future
    if (datetime <= new Date()) {
      throw createValidationError("release_datetime must be in the future");
    }
  }

  try {
    // Check if all checklist items are fulfilled before allowing submission
    const [businessResult, customerResult, shopResult, orderSettingsResult, menuResult] = await Promise.all([
      client.send(new GetItemCommand({
        TableName: "businessinformations",
        Key: { shop_id: { S: userData.shop_id } },
        ProjectionExpression: "hasAllRequiredField"
      })),
      client.send(new GetItemCommand({
        TableName: "CustomerFacingDetails",
        Key: { shop_id: { S: userData.shop_id } },
        ProjectionExpression: "hasAllRequiredField"
      })),
      client.send(new GetItemCommand({
        TableName: "Shops",
        Key: { shop_id: { S: userData.shop_id } },
        ProjectionExpression: "StripeConnectAccountId"
      })),
      client.send(new GetItemCommand({
        TableName: "Order_Settings",
        Key: { shopId: { S: userData.shop_id } },
        ProjectionExpression: "bookingDaysAhead, defaultDailyQuota, hours, minNoticeHours, orderMode, updatedAt"
      })),
      client.send(new GetItemCommand({
        TableName: "Menus",
        Key: { shop_id: { S: userData.shop_id } },
        ProjectionExpression: "menu"
      }))
    ]);

    let businessHasAllRequiredField = false;
    let customerHasAllRequiredField = false;

    if (businessResult.Item && businessResult.Item.hasAllRequiredField) {
      businessHasAllRequiredField = businessResult.Item.hasAllRequiredField.BOOL !== undefined
        ? businessResult.Item.hasAllRequiredField.BOOL
        : false;
    }

    if (customerResult.Item && customerResult.Item.hasAllRequiredField) {
      customerHasAllRequiredField = customerResult.Item.hasAllRequiredField.BOOL !== undefined
        ? customerResult.Item.hasAllRequiredField.BOOL
        : false;
    }

    let stripeConnectReady = false;
    const stripeAccountId = shopResult.Item?.StripeConnectAccountId?.S;
    if (stripeAccountId) {
      try {
        const stripeConnect = getConnectStripe();
        const account = await stripeConnect.accounts.retrieve(stripeAccountId);
        stripeConnectReady = account.details_submitted && account.charges_enabled;
      } catch {
        stripeConnectReady = false;
      }
    }

    const requiredOrderFields = ['bookingDaysAhead', 'defaultDailyQuota', 'hours', 'minNoticeHours', 'orderMode', 'updatedAt'];
    const orderSettingsReady = orderSettingsResult.Item
      ? requiredOrderFields.every(field => {
          const attr = orderSettingsResult.Item[field];
          if (!attr) return false;
          const value = attr.S ?? attr.N ?? attr.BOOL ?? attr.L ?? attr.M;
          if (value === undefined || value === null) return false;
          if (typeof value === 'string') return value.trim() !== '';
          if (Array.isArray(value)) return value.length > 0;
          return true;
        })
      : false;

    let menuSettingReady = false;
    if (menuResult.Item?.menu?.S) {
      try {
        const parsed = JSON.parse(menuResult.Item.menu.S);
        menuSettingReady = Array.isArray(parsed.items) && parsed.items.length > 0;
      } catch {
        menuSettingReady = false;
      }
    }

    // Validate that all checklist items are fulfilled
    if (!businessHasAllRequiredField || !customerHasAllRequiredField || !orderSettingsReady || !menuSettingReady || !stripeConnectReady) {
      const missingSections = [];
      if (!businessHasAllRequiredField) missingSections.push("Business Information");
      if (!customerHasAllRequiredField) missingSections.push("Customer Facing Details");
      if (!orderSettingsReady) missingSections.push("Order Settings");
      if (!menuSettingReady) missingSections.push("Menu Settings");
      if (!stripeConnectReady) missingSections.push("Stripe Connect");

      throw createValidationError(`Cannot submit for review. Please complete all required sections: ${missingSections.join(", ")}`);
    }

    const sentDateTime = new Date().toISOString();

    // Store the review request in shop_release_contact table
    const params = {
      TableName: "shop_release_contact",
      Item: {
        shop_id: { S: userData.shop_id },
        release_type: { S: release_type },
        release_datetime: release_datetime ? { S: release_datetime } : { NULL: true },
        contact_details_name: { S: contact_details_name },
        contact_details_role: { S: contact_details_role },
        contact_details_phone_number: contact_details_phone_number ? { S: contact_details_phone_number } : { NULL: true },
        contact_details_email: { S: contact_details_email },
        user_email: { S: userEmail },
        review_status: { S: "pending" }
      }
    };

    // Store in review_customer_release table
    const reviewParams = {
      TableName: "review_customer_release",
      Item: {
        shop_id: { S: userData.shop_id },
        sentdatetime: { S: sentDateTime }
      }
    };

    await client.send(new PutItemCommand(params));
    await client.send(new PutItemCommand(reviewParams));

    res.status(200).json(createSuccessResponse("Review request submitted successfully", {
      shop_id: userData.shop_id,
      release_type: release_type,
      status: "pending"
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error submitting review request:", error);
    throw createDatabaseError("submit review request", error, "exports.sendForReview");
  }
});

export const cancelRelease = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  const shop_id = userData.shop_id;

  try {
    // Delete from review_customer_release table
    const deleteParams = {
      TableName: "review_customer_release",
      Key: {
        shop_id: { S: shop_id }
      }
    };

    await client.send(new DeleteItemCommand(deleteParams));

    res.status(200).json(createSuccessResponse("Release request cancelled successfully", {
      shop_id: shop_id
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error cancelling release request:", error);
    throw createDatabaseError("cancel release request", error, "exports.cancelRelease");
  }
});

export const cancelScheduledRelease = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;

  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }

  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  const shop_id = userData.shop_id;
  const trimmedShopId = shop_id.trim();

  try {
    const scheduledDeleteParams = {
      TableName: "Scheduled_Accepted_Customer_Review",
      Key: {
        shop_id: { S: shop_id }
      }
    };

    await client.send(new DeleteItemCommand(scheduledDeleteParams));

    // Delete from review_customer_release (composite key: shop_id + sentdatetime)
    const shopIdVariants = [trimmedShopId, shop_id, trimmedShopId + "\n\n\n"];
    for (const sid of shopIdVariants) {
      const reviewQueryParams = {
        TableName: "review_customer_release",
        KeyConditionExpression: "shop_id = :sid",
        ExpressionAttributeValues: { ":sid": { S: sid } }
      };
      const reviewQueryResult = await client.send(new QueryCommand(reviewQueryParams));
      const items = reviewQueryResult.Items || [];
      if (items.length > 0) {
        for (const item of items) {
          const key = { shop_id: item.shop_id, sentdatetime: item.sentdatetime };
          await client.send(new DeleteItemCommand({ TableName: "review_customer_release", Key: key }));
        }
        break;
      }
    }

    // Update the newest ReleaseHistory record from pending to cancelled
    let historyParams = {
      TableName: "ReleaseHistory",
      KeyConditionExpression: "shop_id = :shopId",
      ExpressionAttributeValues: {
        ":shopId": { S: trimmedShopId }
      },
      ScanIndexForward: false,
      Limit: 1
    };
    let historyResult = await client.send(new QueryCommand(historyParams));
    if (!historyResult.Items || historyResult.Items.length === 0) {
      historyParams.ExpressionAttributeValues[":shopId"] = { S: trimmedShopId + "\n\n\n" };
      historyResult = await client.send(new QueryCommand(historyParams));
    }
    if (historyResult.Items && historyResult.Items.length > 0) {
      const latestItem = historyResult.Items[0];
      const historyData = unmarshall(latestItem);
      if (historyData.review_status === "pending") {
        const updateParams = {
          TableName: "ReleaseHistory",
          Key: {
            shop_id: latestItem.shop_id,
            datetime: latestItem.datetime
          },
          UpdateExpression: "SET review_status = :status",
          ExpressionAttributeValues: {
            ":status": { S: "cancelled" }
          }
        };
        await client.send(new UpdateItemCommand(updateParams));
      }
    }

    res.status(200).json(createSuccessResponse("Scheduled release cancelled successfully", {
      shop_id: shop_id
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error cancelling scheduled release:", error);
  }
});


export const getReleasedHistory = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  let shop_id = userData.shop_id;

  if (!shop_id) {
    throw createValidationError("shop_id not found in cookie");
  }

  // Trim whitespace and newlines from shop_id to match database format
  shop_id = shop_id.trim();

  try {
    console.log("Querying ReleaseHistory for shop_id:", shop_id);
    
    // First, try a Scan to see if any data exists in the table
    const scanParams = {
      TableName: "ReleaseHistory",
      Limit: 10  // Just get a few items to check
    };
    
    console.log("Scanning ReleaseHistory table to check for data...");
    const scanResult = await client.send(new ScanCommand(scanParams));
    console.log("Scan result - Items count:", scanResult.Items ? scanResult.Items.length : 0);
    if (scanResult.Items && scanResult.Items.length > 0) {
      console.log("Sample items from Scan:", scanResult.Items.slice(0, 3).map(item => unmarshall(item)));
      console.log("Sample shop_ids found:", scanResult.Items.slice(0, 3).map(item => item.shop_id?.S));
    }
    
    // Now try the Query - with composite key (partition key: shop_id, sort key: datetime)
    // Querying with just partition key returns all items for that shop_id, sorted by datetime
    // Note: If database has shop_ids with trailing newlines, we need to match exactly
    // Try both trimmed and with potential newlines to handle data inconsistencies
    const trimmedShopId = shop_id.trim();
    
    // First try with trimmed shop_id
    let params = {
      TableName: "ReleaseHistory",
      KeyConditionExpression: "shop_id = :shopId",
      ExpressionAttributeValues: {
        ":shopId": { S: trimmedShopId }
      },
      ScanIndexForward: false,  // Newest first (descending order by sort key 'datetime')
      Limit: 10  // Only return the latest 10 records
    };
    
    console.log("Querying with trimmed shop_id:", trimmedShopId);
    
    let result = await client.send(new QueryCommand(params));
    console.log("Query result with trimmed shop_id - Items count:", result.Items ? result.Items.length : 0);
    
    // If no results with trimmed shop_id, try with newlines (matching database format)
    if (!result.Items || result.Items.length === 0) {
      console.log("No results with trimmed shop_id, trying with newlines to match database format...");
      params.ExpressionAttributeValues[":shopId"] = { S: trimmedShopId + "\n\n\n" };
      result = await client.send(new QueryCommand(params));
      console.log("Query with newlines - Items count:", result.Items ? result.Items.length : 0);
    }
    
    console.log("Final query result - Items count:", result.Items ? result.Items.length : 0);
    
    // Handle empty results - return empty array and success
    // Limit to latest 10 records
    const history = result.Items && result.Items.length > 0 
      ? result.Items.slice(0, 10).map(item => unmarshall(item)) 
      : [];

    res.status(200).json(createSuccessResponse("Released history retrieved successfully", {
      shop_id,
      history,
      debug: {
        scanItemsCount: scanResult.Items ? scanResult.Items.length : 0,
        queryItemsCount: result.Items ? result.Items.length : 0,
        sampleShopIds: scanResult.Items && scanResult.Items.length > 0 
          ? scanResult.Items.slice(0, 5).map(item => item.shop_id?.S) 
          : []
      }
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error retrieving released history:", error);
    throw createDatabaseError("retrieve released history", error, "exports.getReleasedHistory");
  }
});

// Route handler that uses the middleware
export const getReleaseStatus = asyncHandler(async (req, res, next) => {
  // This handler assumes checkReleaseStatus middleware has already run
  // and attached req.releaseStatus, req.shop_id, req.rejected_at, req.sentdatetime, and req.reason
  const responseData = {
    shop_id: req.shop_id,
    status: req.releaseStatus
  };

  // Include rejection data if available
  if (req.rejected_at !== undefined) {
    responseData.rejected_at = req.rejected_at;
  }
  if (req.sentdatetime !== undefined) {
    responseData.sentdatetime = req.sentdatetime;
  }
  if (req.reason !== undefined) {
    responseData.reason = req.reason;
  }
  if (req.accepted_at !== undefined) {
    responseData.accepted_at = req.accepted_at;
  }

  res.status(200).json(createSuccessResponse("Release status retrieved successfully", responseData));
});

export const invitationStatus = asyncHandler(async (req, res, next) => {
  let { email } = req.query;
  
  if (!email) {
    throw createValidationError("Email parameter is required");
  }
  
  // Fix URL encoding issues - replace spaces with + (common issue with + in emails)
  email = email.replace(/\s/g, '+');
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createValidationError("Invalid email format");
  }
  
  try {
    // Use QueryCommand with email GSI for efficient lookup
    const params = {
      TableName: "invitedUser",
      IndexName: "email-index",  // Assuming you'll name it "email-index"
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": { S: email }
      }
    };

    const { Items } = await client.send(new QueryCommand(params));
    
    if (Items && Items.length > 0) {
      // Clean the data
      const invitationData = Items.map((item) => {
        let cleanedItem = {};
        for (let key in item) {
          cleanedItem[key] = item[key].S ?? item[key];
        }
        return cleanedItem;
      });

      res.status(200).json(createSuccessResponse("Invitation found", {
        is_invited: true,
        invitation_count: Items.length,
        invitations: invitationData
      }));
    } else {
      res.status(200).json(createSuccessResponse("No invitation found", {
        is_invited: false,
        invitation_count: 0,
        invitations: []
      }));
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error checking invitation status:", error);
    throw createDatabaseError("check invitation status", error, "exports.invitationStatus");
  }
});

export const getReleaseContact = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  const shop_id = userData.shop_id;

  try {
    const params = {
      TableName: "shop_release_contact",
      Key: {
        shop_id: { S: shop_id }
      }
    };

    const { Item } = await client.send(new GetItemCommand(params));

    if (!Item) {
      res.status(200).json(createSuccessResponse("No release contact data found for this shop_id", null));
      return;
    }

    // Clean the data - handle String types and NULL values
    let cleanedData = {};
    for (let key in Item) {
      if (Item[key].NULL !== undefined) {
        cleanedData[key] = null;
      } else if (Item[key].S !== undefined) {
        cleanedData[key] = Item[key].S;
      } else {
        cleanedData[key] = Item[key];
      }
    }

    res.status(200).json(createSuccessResponse("Release contact data retrieved successfully", cleanedData));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error retrieving release contact data:", error);
    throw createDatabaseError("get release contact data", error, "exports.getReleaseContact");
  }
});

export const getReviewStatus = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  let shop_id = userData.shop_id;

  if (!shop_id) {
    throw createValidationError("shop_id not found in cookie");
  }

  // Trim shop_id first
  shop_id = shop_id.trim();

  try {
    // Try with trimmed shop_id first
    let params = {
      TableName: "shop_release_contact",
      Key: {
        shop_id: { S: shop_id }
      }
    };

    let { Item } = await client.send(new GetItemCommand(params));

    // If no result, try with newlines (matching database format)
    if (!Item) {
      params = {
        TableName: "shop_release_contact",
        Key: {
          shop_id: { S: shop_id + "\n\n\n" }
        }
      };
      const result = await client.send(new GetItemCommand(params));
      Item = result.Item;
    }

    if (!Item) {
      res.status(200).json(createSuccessResponse("Review status retrieved successfully", {
        shop_id,
        review_status: "",
        show_status: "false"
      }));
      return;
    }

    // Extract review_status - return empty string if not found
    const review_status = (Item.review_status && Item.review_status.S) ? Item.review_status.S.trim() : "";
    
    // Extract reason from shop_release_contact if it exists
    const reason = (Item.reason && Item.reason.S) ? Item.reason.S.trim() : null;
    
    // Build response - show_status will be set based on review_status
    const response = {
      shop_id,
      review_status
    };

    // Determine show_status based on review_status
    // Check for empty string first, then specific statuses
    if (!review_status || review_status === "" || review_status.trim() === "") {
      // For empty string, null, undefined, show_status is false
      response.show_status = "false";
    } else if (review_status === "accepted" || review_status === "rejected") {
      // For accepted/rejected, check review_time age
      response.show_status = "true"; // Default to true
      
      // Include reason if it exists
      if (reason) {
        response.reason = reason;
      }
      
      if (Item.review_time && Item.review_time.S) {
        response.review_time = Item.review_time.S;

        // Determine if review_time is older than 2 weeks
        const reviewTimeDate = new Date(Item.review_time.S);
        if (!isNaN(reviewTimeDate.getTime())) {
          const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
          const now = new Date();
          if (now - reviewTimeDate > twoWeeksMs) {
            response.show_status = "false";
          }
        }
      }
      
      // For rejected status, also fetch additional data from Rejected_Customer_Review table
      if (review_status === "rejected") {
        try {
          const rejectedParams = {
            TableName: "Rejected_Customer_Review",
            Key: {
              shop_id: { S: shop_id }
            }
          };
          
          const { Item: rejectedItem } = await client.send(new GetItemCommand(rejectedParams));
          
          if (rejectedItem) {
            const rejectionData = unmarshall(rejectedItem);
            
            // Add rejected_at if available
            if (rejectionData.rejected_at) {
              response.rejected_at = rejectionData.rejected_at;
            }
            
            // Add sentdatetime if available
            if (rejectionData.sentdatetime) {
              response.sentdatetime = rejectionData.sentdatetime;
            }
            
            // Use reason from Rejected_Customer_Review if not already set from shop_release_contact
            if (!reason && rejectionData.reason) {
              response.reason = rejectionData.reason;
            }
          }
        } catch (error) {
          // Log error but don't fail the request
          console.error("Error fetching rejection data:", error);
        }
      }
    } else if (review_status === "pending") {
      // For pending status, show_status is true
      response.show_status = "true";
    } else {
      // For any other status, show_status is false
      response.show_status = "false";
    }
    res.status(200).json(createSuccessResponse("Review status retrieved successfully", response));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error retrieving review status:", error);
    throw createDatabaseError("retrieve review status", error, "exports.getReviewStatus");
  }
});

export const addStamps = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.userDataHTTP;
  
  if (!cookie) {
    throw createValidationError("Missing userDataHTTP cookie");
  }
  
  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch (error) {
    throw createValidationError("Invalid cookie data");
  }

  const shop_id = userData.shop_id;
  const { phone_number, number_of_stamps } = req.body;

  // Validate required fields
  if (!phone_number) {
    throw createValidationError("phone_number is required");
  }
  if (!number_of_stamps || isNaN(Number(number_of_stamps))) {
    throw createValidationError("number_of_stamps must be a valid number");
  }

  // Convert number_of_stamps to integer
  const number_of_stamps_int = parseInt(Number(number_of_stamps), 10);
  if (isNaN(number_of_stamps_int)) {
    throw createValidationError("number_of_stamps must be a valid integer");
  }

  try {
    // --- Supabase client setup ---
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw createValidationError("Supabase environment variables are missing");
    }
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Check if entry exists in user_cards
    const { data: existingCards, error: selectError } = await supabase
      .from('user_cards')
      .select('id, stamps, expiry_date')
      .eq('phone_number', phone_number)
      .eq('shop_id', shop_id)
      .limit(1);

    if (selectError) throw selectError;

    if (existingCards && existingCards.length > 0) {
      // Update existing card: add stamps
      const existing = existingCards[0];
      const currentStamps = parseInt(existing.stamps ?? 0, 10) || 0;
      const newStamps = currentStamps + number_of_stamps_int;

      const { error: updateError } = await supabase
        .from('user_cards')
        .update({ stamps: newStamps })
        .eq('id', existing.id);
      if (updateError) throw updateError;

      // Insert into stamp_logs
      const claimDateTime = new Date().toISOString();
      const { error: logError } = await supabase
        .from('stamp_logs')
        .insert({
          user_card_id: existing.id,
          shop_id,
          phone_number,
          number_of_stamps: number_of_stamps_int,
          claim_datetime: claimDateTime
        });
      if (logError) throw logError;

      res.status(200).json(createSuccessResponse("Stamps added successfully", {
        phone_number,
        shop_id,
        stamps: newStamps,
        previous_stamps: currentStamps,
        added_stamps: number_of_stamps_int
      }));
      return;
    }

    // Entry doesn't exist, create new entry
    // First, get numberOfDaysToExpire from StampData (DynamoDB)
    const stampDataParams = {
      TableName: "StampData",
      Key: {
        shop_id: { S: shop_id }
      }
    };

    const { Item: stampDataItem } = await client.send(new GetItemCommand(stampDataParams));
    
    if (!stampDataItem || !stampDataItem.numberOfDaysToExpire) {
      throw createNotFoundError("numberOfDaysToExpire not found in StampData for this shop");
    }

    const daysValue = stampDataItem.numberOfDaysToExpire.S || stampDataItem.numberOfDaysToExpire.N;
    if (!daysValue) {
      throw createValidationError("numberOfDaysToExpire is invalid in StampData");
    }

    const numberOfDaysToExpire = parseInt(daysValue, 10);
    if (isNaN(numberOfDaysToExpire)) {
      throw createValidationError("numberOfDaysToExpire must be a valid number");
    }

    // Calculate expiry date: add numberOfDaysToExpire days, set to 00:00:00, round down
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + numberOfDaysToExpire);
    expiryDate.setHours(0, 0, 0, 0);
    const expiryDateString = expiryDate.toISOString();

    // Insert new user_card into Supabase
    const { data: newCardRows, error: insertCardError } = await supabase
      .from('user_cards')
      .insert({
        shop_id,
        phone_number,
        stamps: number_of_stamps_int,
        expiry_date: expiryDateString,
        collected_rewards: [] // initialize empty array
      })
      .select()
      .limit(1);
    if (insertCardError) throw insertCardError;

    const newCard = newCardRows && newCardRows[0];
    const newCardId = newCard ? newCard.id : null;

    // Insert into stamp_logs
    const claimDateTime = new Date().toISOString();
    const { error: insertLogError } = await supabase
      .from('stamp_logs')
      .insert({
        user_card_id: newCardId,
        shop_id,
        phone_number,
        number_of_stamps: number_of_stamps_int,
        claim_datetime: claimDateTime
      });
    if (insertLogError) throw insertLogError;

    res.status(200).json(createSuccessResponse("Stamps added successfully", {
      phone_number,
      shop_id,
      stamps: number_of_stamps_int,
      expiry_date: expiryDateString
    }));
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Error adding stamps:", error);
    throw createDatabaseError("add stamps", error, "exports.addStamps");
  }
});

export const PostMenu = asyncHandler(async (req, res, next) => {
  const { menu: menuStr } = req.body;
  const shop_id = req.session?.shopId;

  if (!shop_id) throw createValidationError("Shop ID is unavailable for this account");
  if (!menuStr) throw createValidationError("menu is required");

  let menu;
  try {
    menu = JSON.parse(menuStr);
  } catch (e) {
    throw createValidationError("menu JSON is invalid");
  }

  // Build a map of uploaded files keyed by item ID
  const fileMap = {};
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      if (file.fieldname.startsWith('item_photo_')) {
        const itemId = file.fieldname.slice('item_photo_'.length);
        fileMap[itemId] = file;
      }
    }
  }

  // Process each item: upload new photos, preserve existing S3 keys
  if (Array.isArray(menu.items)) {
    for (const item of menu.items) {
      if (!item.photo) continue;

      if (item.photo.url === null || item.photo.url === undefined) {
        // New upload
        const file = fileMap[item.id];
        if (file) {
          const s3Key = `menus/${shop_id}/items/${item.id}/${file.originalname}`;
          try {
            await s3.send(new PutObjectCommand({
              Bucket: MENU_BUCKET,
              Key: s3Key,
              Body: file.buffer,
              ContentType: file.mimetype,
            }));
          } catch (err) {
            throw createExternalServiceError('S3', 'upload item photo', err, 'PostMenu');
          }
          item.photo.s3Key = s3Key;
        }
        item.photo.url = null;
      } else {
        // Existing photo returned from frontend as presigned URL — reconstruct the S3 key
        item.photo.s3Key = `menus/${shop_id}/items/${item.id}/${item.photo.name}`;
        item.photo.url = null;
      }
    }
  }

  try {
    await client.send(new PutItemCommand({
      TableName: 'Menus',
      Item: {
        shop_id: { S: shop_id },
        menu: { S: JSON.stringify(menu) },
        updatedAt: { S: new Date().toISOString() },
        isChanges: { BOOL: true },
      },
    }));
  } catch (err) {
    throw createDatabaseError('save menu', err, 'PostMenu');
  }

  res.status(200).json(createSuccessResponse("Menu saved successfully."));
});

export const GetMenu = asyncHandler(async (req, res, next) => {
  const shop_id = req.session?.shopId;

  if (!shop_id) throw createValidationError("Shop ID is unavailable for this account");

  let menuItem;
  try {
    const result = await client.send(new GetItemCommand({
      TableName: 'Menus',
      Key: { shop_id: { S: shop_id } },
    }));
    menuItem = result.Item;
  } catch (err) {
    throw createDatabaseError('get menu', err, 'GetMenu');
  }

  const isEdit = !["pending", "scheduled_released_cancelled", "approved_scheduled"].includes(req.releaseStatus);
  const releaseStatus = req.releaseStatus || null;

  if (!menuItem) {
    return res.status(200).json(createSuccessResponse("Menu retrieved successfully.", { isEdit, releaseStatus, isChanges: false }));
  }

  const menu = JSON.parse(menuItem.menu.S);

  // Generate presigned URLs for items that have an S3 key
  if (Array.isArray(menu.items)) {
    for (const item of menu.items) {
      if (item.photo && item.photo.s3Key) {
        try {
          const command = new GetObjectCommand({
            Bucket: MENU_BUCKET,
            Key: item.photo.s3Key,
          });
          item.photo.url = await getSignedUrl(getS3(), command, { expiresIn: 3600 });
        } catch (err) {
          throw createExternalServiceError('S3', 'generate presigned URL', err, 'GetMenu');
        }
      }
    }
  }

  menu.isEdit = isEdit;
  menu.releaseStatus = releaseStatus;
  menu.isChanges = menuItem.isChanges?.BOOL ?? false;
  res.status(200).json(createSuccessResponse("Menu retrieved successfully.", menu));
});
