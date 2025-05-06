'use client';
import { useState } from 'react';
import GeneralActionCell from '../_views/GeneralActionCell';
import { Alert, Dialog } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { IoMdClose } from 'react-icons/io';
import styles from './ManageSubscriptionCell.module.css';

const ManageSubscriptionCell = () => {

    return (

        <GeneralActionCell
            title='Manage Subscription'
            description='Access the Stripe billing portal to manage your subscription, update payment methods, and view billing history.'
            buttonTitle={'Manage Subscription'}
            onClick={() => {
                window.open('https://billing.stripe.com/p/login/test', '_blank');
            }}
            type="primary"
        />
    );
}

export default ManageSubscriptionCell; 