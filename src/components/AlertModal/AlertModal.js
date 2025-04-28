import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogContentText,
  Button,
} from '@mui/material';
import { IoCloseSharp } from 'react-icons/io5';
import styles from './AlertModal.module.css';

const AlertModal = ({
  open,
  onClose,
  title,
  description,
  onAction,
  actionButtonText = 'Confirm',
  showActionButton = true,
  type = 'primary', // 'error' or 'primary'
  sx,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      fullWidth
      sx={sx}
    >
      <div className={styles.header}>
        <p className={styles.title}>{title}</p>
        <IoCloseSharp className={styles.closeIcon} onClick={onClose} />
      </div>
      
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {description}
        </DialogContentText>
      </DialogContent>
      
      <div className={styles.footer}>
        <div>
          
        </div>
        
        <div className={styles.rightButtons}>
          <Button
            onClick={onClose}
            variant="contained"
            className={`${styles.button} ${styles.cancel}`}
          >
            Cancel
          </Button>

          {showActionButton && (
            <Button
              onClick={onAction}
              variant="contained"
              color={type}
              className={styles.button}
            >
              {actionButtonText}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default AlertModal; 