import { DataGrid } from '@mui/x-data-grid';
import { IconButton, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useState } from 'react';
import AddUsersDialog from './AddUsersDialog';

const UserTable = ({ usersRows, onUserUpdated }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedRowId, setSelectedRowId] = useState(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const handleMenuOpen = (event, rowId) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowId(rowId);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedRowId(null);
    };

    const handleEdit = () => {
        const userToEdit = usersRows.find(user => user.id === selectedRowId);
        if (userToEdit) {
            setEditingUser(userToEdit);
            setIsEditDialogOpen(true);
        }
        handleMenuClose();
    };

    const handleDelete = () => {
        console.log('Delete location with id:', selectedRowId);
        handleMenuClose();
    };

    const handleCloseEditDialog = () => {
        setIsEditDialogOpen(false);
        setEditingUser(null);
    };

    const handleUserUpdated = (updatedUserData) => {
        console.log('User updated:', updatedUserData);
        // TODO: Implement API call to update user
        // For now, just call the parent callback if provided
        if (onUserUpdated) {
            onUserUpdated(updatedUserData);
        }
        handleCloseEditDialog();
    };

    const columns = [
        {
            field: 'id',
            headerName: '#',
            sortable: false,
            width: 0.5,
        },
        {
            field: 'email',
            headerName: 'Email',
            flex: 2,
        },
        {
            field: 'location',
            headerName: 'Location',
            flex: 2,
        },
        {
            field: 'role',
            headerName: 'Role',
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

    return (
        <>
            <DataGrid
                rows={usersRows}
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
            
            <AddUsersDialog
                isOpen={isEditDialogOpen}
                closeAddUserHandler={handleCloseEditDialog}
                onUserInvited={handleUserUpdated}
                editingUser={editingUser}
                isEditMode={true}
            />
        </>
    );
};

export default UserTable; 