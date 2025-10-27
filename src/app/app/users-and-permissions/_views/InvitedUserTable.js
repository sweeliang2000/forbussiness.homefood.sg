import { DataGrid } from '@mui/x-data-grid';
import { IconButton, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useState } from 'react';

const InvitedUserTable = ({ invitedUsersRows }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedRowId, setSelectedRowId] = useState(null);

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

    const handleDelete = () => {
        console.log('Delete location with id:', selectedRowId);
        handleMenuClose();
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
                        <MenuItem onClick={handleResendInvite}>Resend Invite</MenuItem>
                        <MenuItem onClick={handleDelete}>Delete</MenuItem>
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