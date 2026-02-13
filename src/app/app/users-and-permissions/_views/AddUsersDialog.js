import { Button, Dialog, TextField, Alert } from '@mui/material';
import styles from './AddUsersDialog.module.css';
import FullWidthDropdown from '@/components/FullWidthDropdown/FullWidthDropdown';
import { useEffect, useState } from 'react';
import apiClient from '@/utility/api';
import { ADD_USER, LIST_LOCATIONS, UPDATE_USER_ROLE } from '@/utility/apiPaths';

const roles = [
    { value: 'Owner', title: 'Owner' },
    { value: 'Manager', title: 'Manager' },
    { value: 'Operator', title: 'Operator' }
];

const defaultLocation = { value: 'all', title: 'All Locations', location_id: 'all' };

const AddUsersDialog = ({
    isOpen,
    closeAddUserHandler,
    onUserInvited,
    editingUser = null,
    isEditMode = false
}) => {
    const [locations, setLocations] = useState([
        { value: 'all', title: 'All Locations' }
    ]);

    const [email, setEmail] = useState('');
    const [selectedLocation, setSelectedLocation] = useState(defaultLocation);
    const [selectedRole, setSelectedRole] = useState(roles[3].value);
    const [addUserLoading, setAddUserLoading] = useState(false);
    const [buttonDisabled, setButtonDisabled] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const response = await apiClient.get(LIST_LOCATIONS);
                const data = response.data.data;

                const locationOptions = [
                    { value: 'all', title: 'All Locations', location_id: 'all'},
                    ...(data.locations && Array.isArray(data.locations) ? data.locations.map(loc => ({
                        value: loc.id,
                        title: `${loc.locationName}, ${loc.address}`
                    })) : [])
                ];
                setLocations(locationOptions);
            } catch (error) {
                console.error('Error fetching locations:', error);
                const errorData = error?.response?.data;
                const message = errorData?.error?.message;
                const code = errorData?.error?.statusCode;
                console.error(`Failed to fetch locations: ${message} (Error code: ${code})`);
            }
        };
        
        fetchLocations();
    }, []);

    // Populate form when editing a user
    useEffect(() => {
        if (isEditMode && editingUser) {
            setEmail(editingUser.email || '');
            setSelectedRole(editingUser.role || roles[3].value);
            
            // Find the matching location
            const matchingLocation = locations.find(loc => 
                loc.title === editingUser.location || 
                (editingUser.location === 'All Locations' && loc.value === 'all')
            );
            if (matchingLocation) {
                setSelectedLocation(matchingLocation);
            }
        } else {
            // Reset form for add mode
            setEmail('');
            setSelectedLocation(defaultLocation);
            setSelectedRole(roles[3].value);
        }
    }, [isEditMode, editingUser, locations]);

    const addUserHandler = async (event) => {
        event.preventDefault();
        setAddUserLoading(true);
        setErrorMessage('');
        setSuccessMessage('');
        console.log(email, selectedLocation.value, selectedRole);

        if (isEditMode) {
            // Edit mode - update user role via API
            const payload = {
                email: email,
                role: selectedRole
            };

            try {
                const response = await apiClient.put(UPDATE_USER_ROLE, payload);
                
                if (response.data.success) {
                    setSuccessMessage('User role updated successfully');
                    
                    // Call the success callback with updated user data
                    if (onUserInvited) {
                        onUserInvited({
                            email: email,
                            location: selectedLocation.title,
                            role: selectedRole
                        });
                    }
                    
                    // Close dialog after a short delay to show success message
                    setTimeout(() => {
                        closeAddUserHandler();
                        setSuccessMessage('');
                    }, 1500);
                } else {
                    const message = response.data.message || 'Failed to update user role';
                    setErrorMessage(message);
                }
            } catch (error) {
                console.error('Error updating user role:', error);
                const errorData = error?.response?.data;
                const message = errorData?.error?.message || errorData?.message || error?.message || 'Failed to update user role';
                const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
                
                setErrorMessage(`${message}${code !== 'UNKNOWN' ? ` (Error code: ${code})` : ''}`);
            } finally {
                setAddUserLoading(false);
            }
        } else {
            // Add mode - existing logic
            const payload = {
                "receiverEmail": email,
                "location_id": selectedLocation.location_id,
                "location_name": selectedLocation.title,
                "role": selectedRole
            };

            console.log(payload);

            try {
                await apiClient.post(`${ADD_USER}`, payload);
                // Call the success callback with user data
                if (onUserInvited) {
                    onUserInvited({
                        email: email,
                        location: selectedLocation.title,
                        role: selectedRole
                    });
                }
                // Reset form
                setEmail('');
                setSelectedLocation(defaultLocation);
                setSelectedRole(roles[3].value);
                setButtonDisabled(true);
            } catch (error) {
                const errorData = error?.response?.data;
                const message = errorData?.error?.message;
                const code = errorData?.error?.statusCode;

                setErrorMessage(`${message} (Error code: ${code})`);
            } finally {
                setAddUserLoading(false);
            }
        }
    };

    const valueChanged = () => {
        setButtonDisabled(false);
    }

    const onEmailChangeHandler = (event) => {
        valueChanged();
        setEmail(event.target.value);
    };

    const onLocationChangeHandler = (event) => {
        valueChanged();
        setSelectedLocation(event.target);
    };

    const onRoleChangeHandler = (event) => {
        valueChanged();
        setSelectedRole(event.target.value);
    };

    return (
        <Dialog
            open={isOpen}
            fullWidth={true}
            onClose={closeAddUserHandler}
            PaperProps={{
                sx: {
                    maxWidth: '600px',
                    width: '100%',
                    margin: '0 auto',
                },
            }}>
            <form onSubmit={addUserHandler}>
                <div className={styles.content}>
                    <h2>{isEditMode ? 'Edit user' : 'Add new user'}</h2>

                    {errorMessage && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {errorMessage}
                        </Alert>
                    )}

                    {successMessage && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            {successMessage}
                        </Alert>
                    )}

                    <div className={styles.field}>
                        <h3>Email</h3>

                        <TextField
                            name='email'
                            type='email'
                            value={email}
                            onChange={(event) => { onEmailChangeHandler(event) }}
                            variant='outlined'
                            placeholder=''
                            fullWidth
                            disabled={isEditMode}
                        />
                    </div>

                    {/* TODO: In the future, we will allow users to select multiple locations. */}
                    {/* <div className={styles.field}>
                        <h3>Location</h3>

                        <FullWidthDropdown
                            value={selectedLocation.value}
                            onChange={(event) => { onLocationChangeHandler(event) }}
                            options={locations}
                            name='location'
                        />
                    </div> */}

                    <div className={styles.field}>
                        <h3>Role</h3>

                        <FullWidthDropdown
                            value={selectedRole}
                            onChange={(event) => { onRoleChangeHandler(event) }}
                            options={roles}
                            name='role'
                        />
                    </div>
                </div>
                <div className={styles.buttonContainer}>
                    <Button
                        onClick={closeAddUserHandler}
                        loadingPosition='start'
                        variant='outlined'
                        className={styles.cancelButton}
                    >
                        Cancel
                    </Button>

                    <Button
                        type='submit'
                        loading={addUserLoading}
                        disabled={buttonDisabled}
                        loadingPosition='start'
                        variant='contained'
                        className={styles.addButton}
                    >
                        {isEditMode ? 'Update user' : 'Add user'}
                    </Button>
                </div>
            </form>
        </Dialog>
    )
};

export default AddUsersDialog;