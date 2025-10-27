import { DataGrid } from '@mui/x-data-grid';
import { IconButton, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useState } from 'react';
import apiClient from '@/utility/api';
import { DELETE_INVITED_USER } from '@/utility/apiPaths';

const InvitedUserTable = ({ invitedUsersRows, onDeleteSuccess }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedRowId, setSelectedRowId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleMenuOpen = (event, rowId) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowId(rowId);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedRowId(null);
    };

    const handleResendInvite = () => {
        console.log('Resend invite for user with id:', selectedRowId);
        // TODO: Implement resend invite functionality
        handleMenuClose();
    };

    const handleDelete = async () => {
        if (isDeleting) return;
        
        try {
            setIsDeleting(true);
            
            // Find the selected user's email
            const selectedUser = invitedUsersRows.find(user => user.id === selectedRowId);
            if (!selectedUser) {
                console.error('User not found');
                return;
            }

            const payload = {
                email: selectedUser.email
            };

            console.log('Deleting invited user:', selectedUser.email);
            
            const response = await apiClient.delete(DELETE_INVITED_USER, { data: payload });
            
            if (response.data.success) {
                console.log('Invited user deleted successfully');
                // Call the success callback if provided
                if (onDeleteSuccess) {
                    onDeleteSuccess(selectedUser.email);
                }
            } else {
                console.error('Failed to delete invited user:', response.data.message);
            }
        } catch (error) {
            console.error('Error deleting invited user:', error);
            const message = error?.response?.data?.message || error.message;
            console.error(`Delete invited user failed: ${message}`);
        } finally {
            setIsDeleting(false);
            handleMenuClose();
        }
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
            field: 'status',
            headerName: 'Status',
            flex: 1,
            renderCell: (params) => (
                <span style={{ 
                    textTransform: 'capitalize',
                    color: params.value === 'pending' ? '#ff9800' : 
                           params.value === 'accepted' ? '#4caf50' : 
                           params.value === 'rejected' ? '#f44336' : '#666'
                }}>
                    {params.value}
                </span>
            ),
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
                        <MenuItem onClick={handleResendInvite}>Resend Invite</MenuItem>
                        <MenuItem onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </MenuItem>
                    </Menu>
                </div>
            ),
        },
    ];

    const paginationModel = { page: 0, pageSize: 10 };

    return (
        <DataGrid
            rows={invitedUsersRows}
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
    );
};

export default InvitedUserTable; 