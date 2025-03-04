'use client'
import styles from './LocationSection.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import {
    IconButton,
    Menu,
    MenuItem
} from '@mui/material';
import { useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { LoadingButton } from '@mui/lab';
import AddLocationSection from './AddLocationSection';
import FieldHeader from '@/components/FieldHeader/FieldHeader';

const LocationSection = ({ data }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedRowId, setSelectedRowId] = useState(null);
    const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);

    const paginationModel = { page: 0, pageSize: 10 };

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

    const columns = [
        {
            field: 'locationName',
            headerName: 'Location Name',
            // resizable: true,
            flex: 2, // Optional flex setting for responsive layout
        },
        {
            field: 'address',
            headerName: 'Address',
            // resizable: true,
            flex: 2,
        },
        {
            field: 'postalCode',
            headerName: 'Postal Code',
            // resizable: true,
            flex: 1,
        },
        {
            field: 'operatingHours',
            headerName: 'Operating Hours',
            flex: 2,
            renderCell: (params) => {
                // Combine operating hours for each day
                const hours = params.row.operatingHours;

                return (
                    <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        <p>Monday: {hours.Monday.start ? `${hours.Monday.start} - ${hours.Monday.end}` : 'Not Applicable'}</p>
                        <p>Tuesday: {hours.Tuesday.start ? `${hours.Tuesday.start} - ${hours.Tuesday.end}` : 'Not Applicable'}</p>
                        <p>Wednesday: {hours.Wednesday.start ? `${hours.Wednesday.start} - ${hours.Wednesday.end}` : 'Not Applicable'}</p>
                        <p>Thursday: {hours.Thursday.start ? `${hours.Thursday.start} - ${hours.Thursday.end}` : 'Not Applicable'}</p>
                        <p>Friday: {hours.Friday.start ? `${hours.Friday.start} - ${hours.Friday.end}` : 'Not Applicable'}</p>
                        <p>Saturday: {hours.Saturday.start ? `${hours.Saturday.start} - ${hours.Saturday.end}` : 'Not Applicable'}</p>
                        <p>Sunday: {hours.Sunday.start ? `${hours.Sunday.start} - ${hours.Sunday.end}` : 'Not Applicable'}</p>
                    </div>
                );
            }
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

    // Map the data array to a structure that DataGrid can use
    const rows = data;

    const addLocationHandler = () => {
        setIsAddLocationOpen(true)
    };

    const closeAddLocationHandler = () => {
        setIsAddLocationOpen(false);
    }

    return (
        <>
            <ContentCard className={styles.content}>
                <div className={styles.locationHeader}>
                    <FieldHeader
                        title='Locations'
                        type='h3'
                    />

                    <LoadingButton
                        size='small'
                        onClick={addLocationHandler}
                        // loading={true}
                        // disabled
                        loadingPosition='start'
                        variant='contained'
                        className={styles.button}
                    >
                        Add Location
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
                    style={{ width: '100%', borderRadius: 12 }} 
                    pagination
                />
            </div>

            <AddLocationSection
                closeAddLocationHandler={closeAddLocationHandler}
                isAddLocationOpen={isAddLocationOpen}
            />
        </>

    )
};

export default LocationSection;