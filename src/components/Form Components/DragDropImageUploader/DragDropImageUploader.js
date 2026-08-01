'use client';
import { useRef, useState } from 'react';
import styles from './DragDropImageUploader.module.css';
import Image from 'next/image';
import { FaMinusCircle } from 'react-icons/fa';
import { Button } from '@mui/material';

const DragDropImageUploader = ({
    images,
    setImages,
    noOfImages,
    isMultiple,
    resetSaving,
    width,
    height,
    imageClassName,
    disabled = false
}) => {
    // const [images, setImages] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const renderableImages = Array.isArray(images)
        ? images
            .map((image, originalIndex) => ({ image, originalIndex }))
            .filter(({ image }) => typeof image?.url === 'string' && image.url.trim())
        : [];

    const selectFiles = () => {
        if (disabled) return;
        fileInputRef.current.click()
    };

    const onFileSelect = (event) => {
        if (disabled) return;
        const files = event.target.files;
        if (files.length === 0) return;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            if (files[i].type.split('/')[0] !== 'image') continue;
            if (!images.some((e) => e.name === files[i].name)) {
                const newImage = {
                    name: file.name,
                    file: file,
                    url: URL.createObjectURL(file),
                };

                if (images.length === noOfImages & noOfImages !== 1) {
                    return;
                }

                if (noOfImages > 1) {
                    setImages((prevImages) => [
                        ...prevImages,
                        newImage
                    ])
                } else {
                    setImages([
                        newImage
                    ])
                }
                resetSaving();
            }
        }
    };

    const deleteImage = (index) => {
        if (disabled) return;
        setImages((prevImages) =>
            prevImages.filter((_, i) => i !== index)
        );
        resetSaving();
    };

    const onDragOver = (event) => {
        if (disabled) return;
        event.preventDefault();
        setIsDragging(true);
        event.dataTransfer.dropEffect = 'copy';
    }

    const onDragLeave = (event) => {
        event.preventDefault();
        setIsDragging(false);
    };

    const onDrop = (event) => {
        if (disabled) return;
        event.preventDefault();
        setIsDragging(false);
        const files = event.dataTransfer.files;

        if (files.length === 0) return;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            if (files[i].type.split('/')[0] !== 'image') continue;
            if (!images.some((e) => e.name === files[i].name)) {
                setImages((prevImages) => [
                    ...prevImages,
                    {
                        name: file.name,
                        file: file,
                        url: URL.createObjectURL(file),
                    }
                ])
            }
        }
    };

    const uploadImage = () => {
        console.log('images: ', images);
    };

    return (
        <div className={styles.card}>
            {
                renderableImages.length === 0 ?
                    <div
                        className={styles.dragArea}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                    >
                        {
                            isDragging ? (
                                <span className={styles.select}>Drop image here</span>
                            ) : (
                                <>
                                    Drag & Drop image here or {' '}
                                    <span className={styles.select} role='button' onClick={selectFiles}>
                                        Browser
                                    </span></>
                            )
                        }
                    </div> :
                    <div className={styles.container}>
                        {
                            renderableImages.map(({ image, originalIndex }) => {
                                return (
                                <div className={styles.imageContainer} key={`${image.name || 'image'}-${originalIndex}`}>
                                    {!disabled && <FaMinusCircle className={styles.delete} onClick={() => deleteImage(originalIndex)} />}
                                    <Image
                                        className={`${styles.image} ${imageClassName}`}
                                        width={width}
                                        height={height}
                                        src={image.url}
                                        alt={image.name || 'Uploaded image'} />
                                </div>
                            )})
                        }
                    </div>
            }

            <input
                name='file'
                type='file'
                className={styles.file}
                multiple={noOfImages > 1}
                ref={fileInputRef}
                onChange={onFileSelect}
                disabled={disabled}
            />

            <div className={styles.bottomFooter}>
                <p>{renderableImages.length} of {noOfImages} Image</p>
                <p>|</p>
                <Button
                    className={styles.button}
                    onClick={selectFiles}
                    variant='text'
                    disabled={disabled}
                >
                    {renderableImages.length !== 0 && noOfImages === 1 ? 'Replace' : 'Choose File'}
                </Button>
            </div>
        </div>
    )
};

export default DragDropImageUploader;
