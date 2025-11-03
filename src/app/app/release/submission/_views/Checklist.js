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
                title='Stamp System'
                description={'Ensure that your reward system are setup correctly.'}
                isCompleted={checklistStatus?.stampHasAllRequiredField || false}
            />
        </div>
    )
};

export default Checklists;