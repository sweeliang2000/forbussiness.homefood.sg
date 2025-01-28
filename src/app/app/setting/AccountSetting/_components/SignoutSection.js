'use client';
import styles from './SignoutSection.module.css';
import { Button } from '@mui/material';

const SignoutSection = () => {
    const signoutHandler = () => {

    };

    return(
        <div>
            <Button 
                onClick={signoutHandler}
                className={styles.button} 
                color="error" 
                variant="text" 
                fullWidth>
                Sign out
            </Button>
        </div>
    )
};

export default SignoutSection;