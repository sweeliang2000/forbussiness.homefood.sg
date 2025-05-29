import { Button, Dialog, TextField, Alert } from '@mui/material';
import styles from './AddUsersDialog.module.css';
import FullWidthDropdown from '@/components/FullWidthDropdown/FullWidthDropdown';
import { useEffect, useState } from 'react';
import apiClient from '@/utility/api';
import { ADD_USER } from '@/utility/apiPaths';

const roles = [
    { value: 'Owner', title: 'Owner' },
    { value: 'Manager', title: 'Manager' },
    { value: 'Operator', title: 'Operator' },
    { value: 'Viewer', title: 'Viewer' },
];

const AddUsersDialog = ({
    isOpen,
    closeAddUserHandler
}) => {
    const [locations, setLocations] = useState([
        { value: 'all', title: 'All Locations' }
    ]);

    const [email, setEmail] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('all');
    const [selectedRole, setSelectedRole] = useState(roles[3].value);
    const [addUserLoading, setAddUserLoading] = useState(false);
    const [buttonDisabled, setButtonDisabled] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        // TODO: Fetch locations from API
    }, []);

    const addUserHandler = async (event) => {
        event.preventDefault();
        setAddUserLoading();
        setErrorMessage(null);
        console.log(email, selectedLocation, selectedRole);

        const payload = {
            "receiverEmail": email,
            "location": selectedLocation,
            "role": selectedLocation
        };

        try {
            await apiClient.post(`${ADD_USER}`, payload);
        } catch (error) {
            console.log(error);
            const message = error?.response?.data?.message || error.message;
            const code = error?.response?.data?.code || error.code;
            setErrorMessage(`${message} (Error code: ${code})`);
        } finally {
            setAddUserLoading(false);
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
        setSelectedLocation(event.target.value);
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
                    <h2>Add new user</h2>

                    {errorMessage && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {errorMessage}
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
                        />
                    </div>

                    <div className={styles.field}>
                        <h3>Location</h3>

                        <FullWidthDropdown
                            value={selectedLocation}
                            onChange={(event) => { onLocationChangeHandler(event) }}
                            options={[
                                { value: 'all', title: 'All Locations' }
                            ]}
                            name='location'
                        />
                    </div>

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
                        Add user
                    </Button>
                </div>
            </form>
        </Dialog>
    )
};

export default AddUsersDialog;