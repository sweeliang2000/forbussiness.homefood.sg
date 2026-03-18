'use client';
import styles from './ContactSection.module.css';
import Abutton from '@/components/Buttons/Abutton';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

const ContactSection = () => {
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
                            <a href="mailto:hello@collbine.com">hello@collbine.com</a>
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
                        />
                        <FormTextField 
                            title="Last Name" 
                            placeholder="Enter your last name..." 
                        />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <FormTextField 
                            title="Email" 
                            placeholder="Enter your email address..." 
                            type="email"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <FormTextField 
                            title="How can we help you?" 
                            placeholder="Enter your message..." 
                            multiline
                            rows={4}
                        />
                    </div>

                    <div className={styles.submitButtonWrapper}>
                        <Abutton variant="primary" size="large">
                            Email Us <ArrowForwardIcon style={{ fontSize: '1.2rem', marginLeft: '0.5rem' }} />
                        </Abutton>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ContactSection;

