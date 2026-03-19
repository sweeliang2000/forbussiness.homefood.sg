'use client';
import { useState } from 'react';
import styles from './ContactSection.module.css';
import Abutton from '@/components/Buttons/Abutton';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import apiClient from '@/utility/api';
import LandingContactSuccessModal from '@/components/LandingContactSuccessModal/LandingContactSuccessModal';

const ContactSection = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const validate = () => {
        const trimmedFirstName = firstName.trim();
        const trimmedLastName = lastName.trim();
        const trimmedEmail = email.trim();
        const trimmedMessage = message.trim();

        if (!trimmedFirstName || !trimmedLastName || !trimmedEmail || !trimmedMessage) {
            return 'firstName, lastName, email, and message are required';
        }

        return null;
    };

    const handleSubmit = async () => {
        const validationError = validate();
        if (validationError) {
            setSubmitError(validationError);
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            await apiClient.post('/api/data/contact-us', {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                message: message.trim(),
            });

            setFirstName('');
            setLastName('');
            setEmail('');
            setMessage('');
            setShowSuccessModal(true);
        } catch (err) {
            const errData = err?.response?.data;
            const messageFromBackend =
                errData?.error?.message || errData?.message || err?.message || 'Failed to submit';
            setSubmitError(messageFromBackend);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className={styles.contactSection} id="contact">
            <div className={styles.container}>
                {/* Left Side */}
                <div className={styles.leftContent}>
                    <h2 className={styles.title}>Get in —<br />touch with us</h2>
                    <p className={styles.description}>
                        We&apos;re here to help! Whether you have a question about our services, need assistance with your account, or want to provide feedback, our team is ready to assist you.
                    </p>
                    
                    <div className={styles.contactDetails}>
                        <div className={styles.contactItem}>
                            <h4>Email:</h4>
                            <a href="mailto:contact@collbine.com">contact@collbine.com</a>
                        </div>
                        
                        <div className={styles.contactItem}>
                            <h4>Phone:</h4>
                            <p>+65 8867 8978</p>
                            <p style={{ fontSize: '0.9rem', fontWeight: 'normal', marginTop: '0.25rem', color: 'var(--on-primary-light2)' }}>
                                Available Monday to Friday, 9 AM - 6 PM GMT+8
                            </p>
                        </div>
                    </div>

                    <div>
                        <Abutton 
                            variant="primary" 
                            className={styles.whatsappButton}
                            href="https://wa.me/6512345678"
                            target="_blank"
                            size="large"
                        >
                            Whatsapp Me <WhatsAppIcon style={{ fontSize: '16px', marginLeft: '0.5rem' }} />
                        </Abutton>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className={styles.formCard}>
                    <div className={styles.formRow}>
                        <FormTextField 
                            title="First Name" 
                            placeholder="Enter your first name..." 
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                        />
                        <FormTextField 
                            title="Last Name" 
                            placeholder="Enter your last name..." 
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <FormTextField 
                            title="Email" 
                            placeholder="Enter your email address..." 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <FormTextField 
                            title="How can we help you?" 
                            placeholder="Enter your message..." 
                            multiline
                            rows={4}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>

                    <div className={styles.submitButtonWrapper}>
                        <Abutton
                            variant="primary"
                            size="large"
                            onClick={(e) => {
                                e.preventDefault();
                                if (isSubmitting) return;
                                void handleSubmit();
                            }}
                            aria-disabled={isSubmitting}
                            style={{
                                opacity: isSubmitting ? 0.7 : 1,
                                pointerEvents: isSubmitting ? 'none' : 'auto',
                            }}
                        >
                            Email Us <ArrowForwardIcon style={{ fontSize: '1.2rem', marginLeft: '0.5rem' }} />
                        </Abutton>
                    </div>

                    {submitError ? <p className={styles.submitError}>{submitError}</p> : null}
                </div>
            </div>

            <LandingContactSuccessModal
                open={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                whatsappUrl="https://wa.me/6512345678"
                phoneHref="tel:+6588678978"
                phoneDisplay="+65 8867 8978"
            />
        </section>
    );
};

export default ContactSection;

