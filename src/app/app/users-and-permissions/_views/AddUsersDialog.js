import { Button, Dialog, TextField } from '@mui/material';
import styles from './AddUsersDialog.module.css';
import FullWidthDropdown from '@/components/FullWidthDropdown/FullWidthDropdown';
import { LoadingButton } from '@mui/lab';

const AddUsersDialog = ({
    isOpen,
    closeAddUserHandler
}) => {
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
            <div className={styles.content}>
                <h2>Add new user</h2>

                <div className={styles.field}>
                    <h3>Email</h3>

                    <TextField
                        variant="outlined"
                        placeholder=""
                        fullWidth
                    />
                </div>

                <div className={styles.field}>
                    <h3>Location</h3>

                    <FullWidthDropdown
                        options={[
                            { value: 'Ang mo kio', title: 'Ang mo kio' },
                            { value: 'Ang mo kio', title: 'Ang mo kio' },
                            { value: 'Ang mo kio', title: 'Ang mo kio' },
                        ]}
                    />
                </div>

                <div className={styles.field}>
                    <h3>Role</h3>

                    <FullWidthDropdown
                        options={[
                            { value: 'Owner', title: 'Owener' },
                            { value: 'Manager', title: 'Manager' },
                            { value: 'Viewer', title: 'Viewer' },
                        ]}
                    />
                </div>
            </div>
            <div className={styles.buttonContainer}>
                <Button
                    onClick={closeAddUserHandler}
                    loadingPosition="start"
                    variant="outlined"
                    className={styles.cancelButton}
                >
                    Cancel
                </Button>

                <LoadingButton
                    // onClick={addLocationHandler}
                    // loading={true}
                    // disabled
                    loadingPosition="start"
                    variant="contained"
                    className={styles.addButton}
                >
                    Add user
                </LoadingButton>
            </div>
        </Dialog>
    )
};

export default AddUsersDialog;