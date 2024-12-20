'use client';
import { LoadingButton } from '@mui/lab';
import styles from './UsersAndPermissions.module.css';
import { ContentCard } from "@/components/ContentCard/ContentCard";
import { DataGrid } from '@mui/x-data-grid';
import { IconButton, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useState } from 'react';
import AddUsersDialog from './AddUsersDialog';

const UsersAndPermissions = () => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedRowId, setSelectedRowId] = useState(null);
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);

    const handleMenuOpen = (event, rowId) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowId(rowId);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedRowId(null);
    };

    const handleEdit = () => {
        console.log('Edit location with id:', selectedRowId);
        handleMenuClose();
    };

    const handleDelete = () => {
        console.log('Delete location with id:', selectedRowId);
        handleMenuClose();
    };

    const data = [
        {
            id: 1,
            email: "mokiohub@example.com",
            location: "All",
            role: "Owner"
        },
        {
            id: 2,
            email: "orchardcentral@example.com",
            location: "Orchard Central",
            role: "Manager"
        },
        {
            id: 3,
            email: "vivocity@example.com",
            location: "VivoCity",
            role: "Viewer"
        },
        {
            id: 4,
            email: "jurongpoint@example.com",
            location: "Jurong Point",
            role: "Viewer"
        },
        {
            id: 5,
            email: "changiairportt3@example.com",
            location: "Changi Airport T3",
            role: "Viewer"
        }
    ];

    const rows = data.map((item, index) => ({
        id: item.id,
        email: item.email,
        location: item.location,
        role: item.role
    }));

    const columns = [
        {
            field: 'id',
            headerName: '#',
            // resizable: true,
            sortable: false,
            width: 0.5,
        },
        {
            field: 'email',
            headerName: 'Email',
            // resizable: true,
            flex: 2, // Optional flex setting for responsive layout
        },
        {
            field: 'location',
            headerName: 'Location',
            // resizable: true,
            flex: 2,
        },
        {
            field: 'role',
            headerName: 'Role',
            // resizable: true,
            flex: 1,
        },
        {
            field: 'actions',
            headerName: '',
            width: 50,
            sortable: false,
            align: 'right',
            renderCell: (params) => (
                <div>
                    <IconButton onClick={(event) => handleMenuOpen(event, params.row.id)}>
                        <MoreVertIcon />
                    </IconButton>
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl) && selectedRowId === params.row.id}
                        onClose={handleMenuClose}
                    >
                        <MenuItem onClick={handleEdit}>Edit</MenuItem>
                        <MenuItem onClick={handleDelete}>Delete</MenuItem>
                    </Menu>
                </div>
            ),
        },
    ];

    const paginationModel = { page: 0, pageSize: 10 };

    const addUserHandler = () => {
        setIsAddUserOpen(true);
    };

    const closeAddUserHandler = () => {
        setIsAddUserOpen(false);
    };

    return (
        <>
            <AddUsersDialog 
                isOpen={isAddUserOpen}
                closeAddUserHandler={closeAddUserHandler}
            />

            <div className={styles.container}>
                <ContentCard className={styles.content}>
                    <div>
                        <h2>Users Management</h2>
                        <p className={styles.description}>
                            Manage user accounts and configure permission settings to control access levels and ensure secure operations.
                        </p>
                    </div>
                </ContentCard>

                <ContentCard className={styles.content}>
                    <div className={styles.usersHeader}>
                        <h3 className={styles.noDescriptionTitle}>Users</h3>

                        <LoadingButton
                            size="small"
                            onClick={addUserHandler}
                            // loading={true}
                            // disabled
                            loadingPosition="start"
                            variant="contained"
                            className={styles.button}
                        >
                            Invite user
                        </LoadingButton>
                    </div>
                </ContentCard>

                <div className={styles.tableContainer}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        initialState={{ pagination: { paginationModel } }}
                        disableColumnFilter
                        disableColumnMenu
                        pageSizeOptions={[10]}
                        disableSelectionOnClick
                        getRowHeight={() => 'auto'}
                        style={{ width: '100%' }}
                        pagination
                    />
                </div>
            </div>
        </>
    )
};

export default UsersAndPermissions;