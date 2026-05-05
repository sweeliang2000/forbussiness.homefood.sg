import styles from './Checklist.module.css';
import ChecklistCell from './ChecklistCell';
import { EMAIL_CONTACT_ADDRESS } from '@/utility/constantString';

const Checklists = ({ checklistStatus }) => {
    return (
        <div className={styles.list}>
            <ChecklistCell
                title='Official business details'
                description={`Ensure that the information used to verify your business are all fill up. Once it is approved, changing of any information require you to email to ${EMAIL_CONTACT_ADDRESS}.`}
                isCompleted={checklistStatus?.businessHasAllRequiredField || false}
            />

            <ChecklistCell
                title='Customer-Facing Details'
                description={'Ensure that all the informations are correct as these information will be seen by the user.'}
                isCompleted={checklistStatus?.customerHasAllRequiredField || false}
            />

            <ChecklistCell
                title='Menu and Payment Setup'
                description={(() => {
                    const missing = [];
                    if (!checklistStatus?.menuSettingReady) missing.push('menu');
                    if (!checklistStatus?.orderSettingsReady) missing.push('order settings');
                    if (!checklistStatus?.stripeConnectReady) missing.push('payment details');
                    if (missing.length === 0) return 'Your menu, order settings, and payment details are all configured correctly.';
                    const formatted = missing.length === 1
                        ? missing[0]
                        : `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`;
                    return `Please complete your ${formatted} before submitting for review.`;
                })()}
                isCompleted={checklistStatus?.thirdRequirementMet || false}
            />
        </div>
    )
};

export default Checklists;