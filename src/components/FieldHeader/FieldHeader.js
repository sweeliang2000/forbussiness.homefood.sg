import styles from './FieldHeader.module.css';

// Usage Example:
// <FieldHeader
//  title='Representative Contact Details'
// />
//
// <FieldHeader
//  title='Registered Business Address'
//  description='This is the name that customers will see in the app for example, McDonalds.'
//  type='h3'
// />
const FieldHeader = ({
    title,
    description,
    type,
    className
}) => {

    let header = <h2>{title}</h2>

    if (type === 'h1') {
        header = <h1>{title}</h1>
    } else if (type === 'h3') {
        header = <h3>{title}</h3>
    } else if (type === 'h4') {
        header = <h2>{title}</h2>
    }

    return (
        <div className={`${styles.container} ${className}`}>
            {header}
            {description !== undefined && <p className={styles.description}>{description}</p>}
        </div>
    )
};

export default FieldHeader;