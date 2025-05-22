'use client';
import GeneralActionCell from '../_views/GeneralActionCell';

const ChangePasswordCell = () => {

    return (

        <GeneralActionCell
            title='you@example.com'
            buttonTitle={'Change Password'}
            onClick={() => {
                window.open('https://billing.stripe.com/p/login/test', '_blank');
            }}
            type="primary"
        />
    );
}

export default ChangePasswordCell; 