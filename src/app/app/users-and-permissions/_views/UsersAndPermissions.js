'use client';
import styles from './UsersAndPermissions.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { DataGrid } from '@mui/x-data-grid';
import { IconButton, Menu, MenuItem, Button } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useState, useEffect } from 'react';
import AddUsersDialog from './AddUsersDialog';
import UserTable from './UserTable';
import InvitedUserTable from './InvitedUserTable';
import apiClient from '@/utility/api';
import { GET_LIST_OF_USERS, INVITATION_STATUS } from '@/utility/apiPaths';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import ErrorPage from '@/components/ErrorPage/ErrorPage';
import InvitationBanner from '@/components/InvitationBanner/InvitationBanner';
import { getUserDataFromCookie } from '@/utility/cookieUtils';

// Function to get list of users
const getListOfUsers = async () => {
    try {
      const response = await apiClient.get(GET_LIST_OF_USERS);
      return response.data;
    } catch (error) {
      console.error('Error fetching list of users:', error);
      throw error;
    }
};

// Function to get invitation status
const getInvitationStatus = async (email) => {
    try {
      const response = await apiClient.get(`${INVITATION_STATUS}?email=${encodeURIComponent(email)}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching invitation status:', error);
      throw error;
    }
};

const UsersAndPermissions = () => {
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [usersData, setUsersData] = useState({
        invited_users: [],
        actual_users: []
    });
    const [invitations, setInvitations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingErrorMessage, setIsLoadingErrorMessage] = useState(null);
    const [isLoadingErrorStatus, setIsLoadingErrorStatus] = useState(null);

    // Fetch users data and invitation status on component mount
    useEffect(() => {
        setIsLoading(true);

        const fetchData = async () => {
            try {
                // Fetch users data
                const usersResponse = await getListOfUsers();
                
                if (usersResponse.success) {
                    setUsersData(usersResponse.data);
                    console.log('Users data:', usersResponse.data);
                } else {
                    const message = usersResponse.message || 'Failed to fetch users data';
                    setIsLoadingErrorMessage(`An error had occurred. ${message}`);
                }

                // Fetch invitation status
                const userData = getUserDataFromCookie();
                if (userData && userData.user_id) {
                    try {
                        const invitationResponse = await getInvitationStatus(userData.user_id);
                        console.log('Invitation response:', invitationResponse);
                        if (invitationResponse.success && invitationResponse.data.is_invited) {
                            // Filter out rejected invitations
                            const filteredInvitations = (invitationResponse.data.invitations || [])
                                .filter(invitation => invitation.status !== 'rejected');
                            setInvitations(filteredInvitations);
                            console.log('Invitations data:', filteredInvitations);
                        }
                    } catch (invitationErr) {
                        console.error('Error fetching invitation status:', invitationErr);
                        // Don't set error for invitation fetch failure, just log it
                    }
                }
            } catch (err) {
                console.error('Error fetching data:', err);
                const message = err?.response?.data?.message || err.message;
                const code = err?.response?.data?.code || err.code;
                const statusCode = err?.response?.status;
                setIsLoadingErrorMessage(`An error had occurred. ${message} (Error code: ${code})`);
                setIsLoadingErrorStatus(statusCode ?? null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // Process actual users data with defaults
    const usersRows = usersData.actual_users.map((item, index) => ({
        id: `${index + 1}`,
        email: item.user_id || 'Unknown',
        location: item.location_name || 'All Locations',
        role: item.role || 'Viewer'
    }));

    // Process invited users data with defaults
    const invitedUsersRows = usersData.invited_users.map((item, index) => ({
        id: `${index + 1}`,
        email: item.email || 'Unknown',
        location: item.location_name || 'All Locations',
        role: item.role || 'Viewer',
        status: item.status || 'pending'
    }));

    const addUserHandler = () => {
        setIsAddUserOpen(true);
    };

    const closeAddUserHandler = () => {
        setIsAddUserOpen(false);
    };

    const handleUserInvited = (userData) => {
        const message = `${userData.email} has been invited successfully. An email has been sent to their account, or they can login to accept the role.`;
        setSuccessMessage(message);
        setIsError(false);
        setErrorMessage('');
        setIsAddUserOpen(false);
        
        // Refresh the users data after inviting a new user
        const fetchUsersData = async () => {
            try {
                const response = await getListOfUsers();
                if (response.success) {
                    setUsersData(response.data);
                }
            } catch (err) {
                console.error('Error refreshing users data:', err);
            }
        };
        fetchUsersData();
    };

    const clearSuccessMessage = () => {
        setSuccessMessage('');
    };

    const clearErrorMessage = () => {
        setErrorMessage('');
        setIsError(false);
    };

    const handleDeleteError = (error) => {
        let message = 'Failed to delete user.';
        
        // Prioritize backend response.data.message
        if (error?.response?.data?.message) {
            message = error.response.data.message;
        } else if (error?.response?.data?.error?.message) {
            message = error.response.data.error.message;
        } else if (error?.response?.status === 401) {
            message = 'Unauthorized: You do not have permission to delete this user.';
        } else if (error?.message) {
            message = error.message;
        }
        
        setErrorMessage(message);
        setIsError(true);
        // Clear success message when error occurs
        setSuccessMessage('');
    };

    const handleResendSuccess = (email) => {
        const message = `Invite resent successfully to ${email}.`;
        setSuccessMessage(message);
        setIsError(false);
        setErrorMessage('');
    };

    const handleDeleteSuccess = (email) => {
        const message = `Invited user ${email} has been removed successfully.`;
        setSuccessMessage(message);
        setIsError(false);
        setErrorMessage('');
        
        // Refresh the users data after deleting an invited user
        const fetchUsersData = async () => {
            try {
                const response = await getListOfUsers();
                if (response.success) {
                    setUsersData(response.data);
                }
            } catch (err) {
                console.error('Error refreshing users data:', err);
            }
        };
        fetchUsersData();
    };

    const handleUserUpdated = (updatedUserData) => {
        const message = `User ${updatedUserData.email} has been updated successfully.`;
        setSuccessMessage(message);
        setIsError(false);
        setErrorMessage('');
        
        // Refresh the users data after updating a user
        const fetchUsersData = async () => {
            try {
                const response = await getListOfUsers();
                if (response.success) {
                    setUsersData(response.data);
                }
            } catch (err) {
                console.error('Error refreshing users data:', err);
            }
        };
        fetchUsersData();
    };

    return (
        <>
            <AddUsersDialog 
                isOpen={isAddUserOpen}
                closeAddUserHandler={closeAddUserHandler}
                onUserInvited={handleUserInvited}
            />

            <div className={styles.container}>
                <HeaderSection
                    className={styles.header}
                    title='Users Management'
                    description={
                        <p>
                            Manage user accounts and configure permission settings to control access levels and ensure secure operations.
                        </p>
                    }
                    showButton={false}
                    successMessage={successMessage}
                    setShowSuccess={clearSuccessMessage}
                    isError={isError}
                    errorMessage={errorMessage}
                    setShowError={clearErrorMessage}
                />

                {invitations.length > 0 && (
                    <div className={styles.invitationBanner}>
                        {invitations.map((invitation, index) => {
                            console.log('Invitation:', invitation.invitedFrom);
                            return (
                            <InvitationBanner
                                key={`${invitation.shop_id}-${index}`}
                                invitedby={invitation.invitedFrom}
                                shopname={invitation.shop_id}
                                role={invitation.role}
                                email={invitation.email}
                                shop_id={invitation.shop_id}
                            />
                        )})
                        }
                    </div>
                )}

                <ContentCard className={styles.content}>
                    <div className={styles.usersHeader}>
                        <h3 className={styles.noDescriptionTitle}>Users</h3>

                        <Button
                            size='small'
                            onClick={addUserHandler}
                            // loading={true}
                            // disabled
                            loadingPosition='start'
                            variant='contained'
                            className={styles.button}
                        >
                            Invite user
                        </Button>
                    </div>
                </ContentCard>
            
                {isLoading ? 
                    <LoadingPage/> :
                    isLoadingErrorMessage !== null ? 
                    <ErrorPage message={isLoadingErrorMessage} statusCode={isLoadingErrorStatus} /> :
                    <>
                        { invitedUsersRows.length > 0 &&                    
                            <section>
                                <h4 className={styles.sectionHeaderIos}>Invited users</h4>

                                <div className={styles.tableContainer}>
                                    <InvitedUserTable 
                                        invitedUsersRows={invitedUsersRows} 
                                        onResendSuccess={handleResendSuccess}
                                        onDeleteSuccess={handleDeleteSuccess}
                                    />
                                </div>
                            </section>
                        }

                        <section>
                            <h4 className={styles.sectionHeaderIos}>Users with access</h4>

                            <div className={styles.tableContainer}>
                                <UserTable 
                                    usersRows={usersRows} 
                                    onUserUpdated={handleUserUpdated}
                                    onDeleteError={handleDeleteError}
                                />
                            </div>
                        </section>
                    </>
                }
            </div>
        </>
    )
};

export default UsersAndPermissions;