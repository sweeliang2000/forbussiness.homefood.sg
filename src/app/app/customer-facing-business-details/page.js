import styles from './page.module.css';
import CustomerFacingBusinessPage from './CustomerFacingBusinessPage';

export const metadata = {
  title: 'Customer Facing Details | Collbine for Business',
  description: 'Collbine offers a loyalty system for Singapore merchants. Empower your business with a unique, flexible rewards program that allows customers to earn and redeem points, tailored to your shop’s needs.',
};

const CustomerFacingDetails = () => (
    <div className={styles.container}>
      <CustomerFacingBusinessPage/>
    </div>
);

export default CustomerFacingDetails;