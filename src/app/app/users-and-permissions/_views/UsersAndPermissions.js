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
import { GET_LIST_OF_USERS } from '@/utility/apiPaths';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import ErrorPage from '@/components/ErrorPage/ErrorPage';

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

const UsersAndPermissions = () => {
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [usersData, setUsersData] = useState({
        invited_users: [],
        actual_users: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingErrorMessage, setIsLoadingErrorMessage] = useState(null);

    // Fetch users data on component mount
    useEffect(() => {
        setIsLoading(true);

        const fetchUsersData = async () => {
            try {
                const response = await getListOfUsers();
                
                if (response.success) {
                    setUsersData(response.data);
                    console.log(response.data);
                } else {
                    const message = response.message || 'Failed to fetch users data';
                    setIsLoadingErrorMessage(`An error had occurred. ${message}`);
                }
            } catch (err) {
                console.error('Error fetching users:', err);
                const message = err?.response?.data?.message || err.message;
                const code = err?.response?.data?.code || err.code;
                setIsLoadingErrorMessage(`An error had occurred. ${message} (Error code: ${code})`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsersData();
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
        role: item.role || 'Viewer'
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

    const handleResendSuccess = (email) => {
        const message = `Invite resent successfully to ${email}.`;
        setSuccessMessage(message);
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
                />

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
                    <ErrorPage/> :
                    <>
                        <section>
                            <h4 className={styles.sectionHeaderIos}>Invited users</h4>

                            <div className={styles.tableContainer}>
                                <InvitedUserTable 
                                    invitedUsersRows={invitedUsersRows} 
                                    onResendSuccess={handleResendSuccess}
                                />
                            </div>
                        </section>

                        <section>
                            <h4 className={styles.sectionHeaderIos}>Users with access</h4>

                            <div className={styles.tableContainer}>
                                <UserTable usersRows={usersRows} />
                            </div>
                        </section>
                    </>
                }
            </div>
        </>
    )
};

export default UsersAndPermissions;