'use client';
import styles from './UsersAndPermissions.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { DataGrid } from '@mui/x-data-grid';
import { IconButton, Menu, MenuItem, Button } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useState } from 'react';
import AddUsersDialog from './AddUsersDialog';
import UserTable from './UserTable';
import InvitedUserTable from './InvitedUserTable';

const UsersAndPermissions = () => {
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const usersTable = [
        {
            id: 1,
            email: 'mokiohub@example.com',
            location: 'All',
            role: 'Owner'
        },
        {
            id: 2,
            email: 'orchardcentral@example.com',
            location: 'Orchard Central',
            role: 'Manager'
        },
        {
            id: 3,
            email: 'vivocity@example.com',
            location: 'VivoCity',
            role: 'Viewer'
        },
        {
            id: 4,
            email: 'jurongpoint@example.com',
            location: 'Jurong Point',
            role: 'Viewer'
        },
        {
            id: 5,
            email: 'changiairportt3@example.com',
            location: 'Changi Airport T3',
            role: 'Viewer'
        }
    ];

    const usersRows = usersTable.map((item, index) => ({
        id: item.id,
        email: item.email,
        location: item.location,
        role: item.role
    }));

    const invitedUsersTable = [
        {
            id: 101,
            email: 'invited1@example.com',
            location: 'All',
            role: 'Manager'
        },
        {
            id: 102,
            email: 'invited2@example.com',
            location: 'Orchard Central',
            role: 'Viewer'
        },
        {
            id: 103,
            email: 'invited3@example.com',
            location: 'VivoCity',
            role: 'Viewer'
        }
    ];

    const invitedUsersRows = invitedUsersTable.map((item) => ({
        id: item.id,
        email: item.email,
        location: item.location,
        role: item.role
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
    };

    const clearSuccessMessage = () => {
        setSuccessMessage('');
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
            
                <section>
                    <h4 className={styles.sectionHeaderIos}>Invited users</h4>

                    <div className={styles.tableContainer}>
                        <InvitedUserTable invitedUsersRows={invitedUsersRows} />
                    </div>
                </section>

                <section>
                    <h4 className={styles.sectionHeaderIos}>Users with access</h4>

                    <div className={styles.tableContainer}>
                        <UserTable usersRows={usersRows} />
                    </div>
                </section>
            </div>
        </>
    )
};

export default UsersAndPermissions;