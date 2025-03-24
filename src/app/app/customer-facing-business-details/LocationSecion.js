'use client'
import styles from './LocationSection.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import {
    IconButton,
    Menu,
    MenuItem,
    Button
} from '@mui/material';
import { useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddLocationSection from './AddLocationSection';
import FieldHeader from '@/components/FieldHeader/FieldHeader';

const LocationSection = ({ 
    locations,
    setLocations
 }) => {
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
                        <p>Monday: {hours.monday.isOpen ? `${hours.monday.start} - ${hours.monday.end}` : 'Closed'}</p>
                        <p>Tuesday: {hours.tuesday.isOpen ? `${hours.tuesday.start} - ${hours.tuesday.end}` : 'Closed'}</p>
                        <p>Wednesday: {hours.wednesday.isOpen ? `${hours.wednesday.start} - ${hours.wednesday.end}` : 'Closed'}</p>
                        <p>Thursday: {hours.thursday.isOpen ? `${hours.thursday.start} - ${hours.thursday.end}` : 'Closed'}</p>
                        <p>Friday: {hours.friday.isOpen ? `${hours.friday.start} - ${hours.friday.end}` : 'Closed'}</p>
                        <p>Saturday: {hours.saturday.isOpen ? `${hours.saturday.start} - ${hours.saturday.end}` : 'Closed'}</p>
                        <p>Sunday: {hours.sunday.isOpen ? `${hours.sunday.start} - ${hours.sunday.end}` : 'Closed'}</p>
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

                    <Button
                        size='small'
                        onClick={addLocationHandler}
                        // loading={true}
                        // disabled
                        loadingPosition='start'
                        variant='contained'
                        className={styles.button}
                    >
                        Add Location
                    </Button>
                </div>
            </ContentCard>

            <div className={styles.tableContainer}>
                <DataGrid
                    rows={locations}
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
                locations={locations}
                setLocations={setLocations}
                closeAddLocationHandler={closeAddLocationHandler}
                isAddLocationOpen={isAddLocationOpen}
            />
        </>

    )
};

export default LocationSection;