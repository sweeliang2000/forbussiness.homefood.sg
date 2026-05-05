import { DataGrid } from '@mui/x-data-grid';
import { IconButton, Menu, MenuItem, TextField, Alert } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useState } from 'react';
import apiClient from '@/utility/api';
import { DELETE_USER_FROM_SHOP } from '@/utility/apiPaths';
import AlertModal from '@/components/AlertModal/AlertModal';
import AddUsersDialog from './AddUsersDialog';

const UserTable = ({ usersRows, onUserUpdated, onDeleteError }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedRowId, setSelectedRowId] = useState(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmationText, setConfirmationText] = useState('');
    const [confirmationError, setConfirmationError] = useState('');
    const [userToDeleteId, setUserToDeleteId] = useState(null);

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

    const handleDeleteClick = () => {
        setUserToDeleteId(selectedRowId);
        setShowConfirmDialog(true);
        handleMenuClose();
    };

    const handleConfirmDelete = async () => {
        if (confirmationText.toLowerCase() !== 'confirm') {
            setConfirmationError('Please type "confirm" to proceed');
            return;
        }
        
        if (isDeleting) return;
        
        setConfirmationError('');
        setShowConfirmDialog(false);
        setIsDeleting(true);

        try {
            // Find the selected user using the preserved ID
            const selectedUser = usersRows.find(user => user.id === userToDeleteId);
            if (!selectedUser) {
                console.error('User not found');
                setIsDeleting(false);
                return;
            }

            const payload = {
                email: selectedUser.email
            };

            console.log('Deleting user from shop:', selectedUser.email);
            
            const response = await apiClient.delete(DELETE_USER_FROM_SHOP, { data: payload });
            
            if (response.data.success) {
                console.log('User deleted successfully');
                // Call the parent callback if provided to refresh the list
                if (onUserUpdated) {
                    onUserUpdated(selectedUser);
                }
            } else {
                console.error('Failed to delete user:', response.data.message);
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            const errorData = error?.response?.data;
            const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
            const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
            console.error(`Delete user failed: ${message} (Error code: ${code})`);
            
            // Notify parent component about the error
            if (onDeleteError) {
                onDeleteError(error);
            }
        } finally {
            setIsDeleting(false);
            setSelectedRowId(null);
            setUserToDeleteId(null);
            setConfirmationText('');
        }
    };

    const handleCancelDelete = () => {
        setShowConfirmDialog(false);
        setSelectedRowId(null);
        setUserToDeleteId(null);
        setConfirmationText('');
        setConfirmationError('');
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
                        <MenuItem 
                            onClick={handleDeleteClick} 
                            disabled={isDeleting}
                            sx={{ color: 'error.main' }}
                        >
                            Delete
                        </MenuItem>
                    </Menu>
                </div>
            ),
        },
    ];

    const paginationModel = { page: 0, pageSize: 10 };

    const selectedUser = usersRows.find(user => user.id === (userToDeleteId || selectedRowId));

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

            <AlertModal
                open={showConfirmDialog}
                onClose={handleCancelDelete}
                title="Delete User"
                description={
                    <div>
                        {confirmationError && (
                            <Alert 
                                severity="error" 
                                sx={{ marginBottom: '16px' }}
                            >
                                {confirmationError}
                            </Alert>
                        )}

                        <p style={{ marginBottom: '16px' }}>
                            Are you sure you want to delete {selectedUser?.email || 'this user'}?
                        </p>
                        <p style={{ marginBottom: '16px', fontWeight: 'bold' }}>
                            This action cannot be undone.
                        </p>

                        <TextField
                            fullWidth
                            label="Type 'confirm' to proceed"
                            value={confirmationText}
                            onChange={(e) => {
                                setConfirmationText(e.target.value);
                                setConfirmationError('');
                            }}
                            variant="outlined"
                            size="small"
                            placeholder="Type 'confirm' here"
                            error={!!confirmationError}
                        />
                    </div>
                }
                onAction={handleConfirmDelete}
                actionButtonText={isDeleting ? 'Deleting...' : 'Delete'}
                type="error"
                showActionButton={true}
            />
        </>
    );
};

export default UserTable; 