'use client';
import styles from './UsersAndPermissions.module.css';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { Button } from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import AddUsersDialog from './AddUsersDialog';
import UserTable from './UserTable';
import InvitedUserTable from './InvitedUserTable';
import apiClient from '@/utility/api';
import { GET_LIST_OF_USERS, INVITATION_STATUS } from '@/utility/apiPaths';
import ErrorPage from '@/components/ErrorPage/ErrorPage';
import InvitationBanner from '@/components/InvitationBanner/InvitationBanner';
import { getUserDataFromCookie } from '@/utility/cookieUtils';
import usePermissions from '@/hooks/usePermissions';
import PermissionGate from '@/components/PermissionGate/PermissionGate';
import { CAP } from '@/lib/permissions';

const getListOfUsers = async () => {
    const response = await apiClient.get(GET_LIST_OF_USERS);
    return response.data;
};

const getInvitationStatus = async (email) => {
    const response = await apiClient.get(
        `${INVITATION_STATUS}?email=${encodeURIComponent(email)}`
    );
    return response.data;
};

// Every failure path on this page ends up as one sentence in the header
// alert, so the unwrapping lives in one place.
const readErrorMessage = (error, fallback) =>
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback;

const UsersAndPermissions = () => {
    const { can } = usePermissions();
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [usersData, setUsersData] = useState({
        invited_users: [],
        actual_users: []
    });
    const [invitations, setInvitations] = useState([]);
    const [currentUserEmail, setCurrentUserEmail] = useState('');
    const [currentUserRole, setCurrentUserRole] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingErrorMessage, setIsLoadingErrorMessage] = useState(null);
    const [isLoadingErrorStatus, setIsLoadingErrorStatus] = useState(null);

    const reportSuccess = useCallback((message) => {
        setSuccessMessage(message);
        setIsError(false);
        setErrorMessage('');
    }, []);

    const reportError = useCallback((error, fallback) => {
        setErrorMessage(readErrorMessage(error, fallback));
        setIsError(true);
        setSuccessMessage('');
    }, []);

    const refreshUsers = useCallback(async () => {
        try {
            const response = await getListOfUsers();
            if (response.success) setUsersData(response.data);
        } catch (error) {
            console.error('Error refreshing users data:', error);
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const usersResponse = await getListOfUsers();

                if (usersResponse.success) {
                    setUsersData(usersResponse.data);
                } else {
                    setIsLoadingErrorMessage(
                        `An error had occurred. ${usersResponse.message || 'Failed to fetch users data'}`
                    );
                }

                const userData = getUserDataFromCookie();
                if (userData?.user_id) {
                    setCurrentUserEmail(userData.user_id);
                    // Only decides which affordances to render; the server
                    // re-checks against verified Cognito claims.
                    setCurrentUserRole(userData.role || '');
                    try {
                        const invitationResponse = await getInvitationStatus(userData.user_id);
                        if (invitationResponse.success && invitationResponse.data.is_invited) {
                            setInvitations(
                                (invitationResponse.data.invitations || []).filter(
                                    (invitation) => invitation.status !== 'rejected'
                                )
                            );
                        }
                    } catch (invitationErr) {
                        // A missing invitation lookup shouldn't take the page down.
                        console.error('Error fetching invitation status:', invitationErr);
                    }
                }
            } catch (err) {
                console.error('Error fetching data:', err);
                const code = err?.response?.data?.code || err.code;
                setIsLoadingErrorMessage(
                    `An error had occurred. ${readErrorMessage(err, 'Failed to fetch users data')} (Error code: ${code})`
                );
                setIsLoadingErrorStatus(err?.response?.status ?? null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // The email is the person, and it's unique within a shop — using the
    // array index meant a row's menu could act on whoever happened to
    // land at that position after a refresh.
    const usersRows = usersData.actual_users.map((item) => ({
        id: item.user_id,
        email: item.user_id || 'Unknown',
        role: item.role || 'Operator'
    }));

    const invitedUsersRows = usersData.invited_users.map((item) => ({
        id: item.email,
        email: item.email || 'Unknown',
        role: item.role || 'Operator',
        status: item.status || 'pending'
    }));

    const handleUserInvited = (userData) => {
        setIsAddUserOpen(false);
        reportSuccess(
            `${userData.email} has been invited. We've emailed them an invitation — they can also accept it by logging in.`
        );
        refreshUsers();
    };

    const handleUserUpdated = (updatedUserData) => {
        reportSuccess(`${updatedUserData.email}'s role has been updated.`);
        refreshUsers();
    };

    const handleUserDeleted = (user) => {
        reportSuccess(`${user.email} no longer has access to this shop.`);
        refreshUsers();
    };

    const handleResendSuccess = (email) => {
        reportSuccess(`Invitation resent to ${email}.`);
    };

    const handleInviteDeleted = (email) => {
        reportSuccess(`The invitation for ${email} has been revoked.`);
        refreshUsers();
    };

    return (
        <>
            <AddUsersDialog
                isOpen={isAddUserOpen}
                closeAddUserHandler={() => setIsAddUserOpen(false)}
                onUserInvited={handleUserInvited}
            />

            <div className={styles.container}>
                <HeaderSection
                    className={styles.header}
                    title="Users & permissions"
                    description={
                        <p>
                            Choose who can work in your shop and what each of them is allowed
                            to do.
                        </p>
                    }
                    showButton={false}
                    capability={CAP.USERS_INVITE}
                    rightActions={
                        <PermissionGate allowed={can(CAP.USERS_INVITE)} capability={CAP.USERS_INVITE}>
                            <Button
                                size="small"
                                variant="contained"
                                className={styles.inviteButton}
                                onClick={() => setIsAddUserOpen(true)}
                            >
                                Invite user
                            </Button>
                        </PermissionGate>
                    }
                    successMessage={successMessage}
                    setShowSuccess={() => setSuccessMessage('')}
                    isError={isError}
                    errorMessage={errorMessage}
                    setShowError={() => {
                        setErrorMessage('');
                        setIsError(false);
                    }}
                />

                {invitations.length > 0 && (
                    <div className={styles.invitationBanner}>
                        {invitations.map((invitation, index) => (
                            <InvitationBanner
                                key={`${invitation.shop_id}-${index}`}
                                invitedby={invitation.invitedFrom}
                                shopname={invitation.shop_id}
                                role={invitation.role}
                                email={invitation.email}
                                shop_id={invitation.shop_id}
                            />
                        ))}
                    </div>
                )}

                {isLoadingErrorMessage !== null ? (
                    <ErrorPage
                        message={isLoadingErrorMessage}
                        statusCode={isLoadingErrorStatus}
                    />
                ) : (
                    <>
                        {/* Invites come first: they're the outstanding thing
                            needing attention, and the list disappears once
                            there's nothing pending. */}
                        {!isLoading && invitedUsersRows.length > 0 && (
                            <InvitedUserTable
                                invitedUsersRows={invitedUsersRows}
                                onResendSuccess={handleResendSuccess}
                                onResendError={(error) =>
                                    reportError(error, 'Failed to resend the invitation.')
                                }
                                onDeleteSuccess={handleInviteDeleted}
                                onDeleteError={(error) =>
                                    reportError(error, 'Failed to revoke the invitation.')
                                }
                            />
                        )}

                        <UserTable
                            usersRows={usersRows}
                            currentUserEmail={currentUserEmail}
                            currentUserRole={currentUserRole}
                            isLoading={isLoading}
                            onUserUpdated={handleUserUpdated}
                            onUserDeleted={handleUserDeleted}
                            onSessionsRevoked={(email) =>
                                reportSuccess(`${email} has been signed out of all sessions.`)
                            }
                            onDeleteError={(error) =>
                                reportError(error, 'Failed to remove the user.')
                            }
                        />
                    </>
                )}
            </div>
        </>
    )
};

export default UsersAndPermissions;
