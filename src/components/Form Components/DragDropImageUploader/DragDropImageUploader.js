'use client';
import { useRef, useState } from 'react';
import styles from './DragDropImageUploader.module.css';

const DragDropImageUploader = () => {
    const [images, setImages] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const selectFiles = () => {
        fileInputRef.current.click()
    };

    const onFileSelect = (event) => {
        const files = event.target.files;
        if (files.length === 0) return;
        for (let i = 0; i < files.length; i++) {
            if (files[i].type.split('/')[0] !== 'image') continue;
            if (!images.some((e) => e.name === files[i].name)) {
                setImages((prevImages) => [
                    ...prevImages,
                    {
                        name: files[i].name,
                        url: URL.createObjectURL(files[i]),
                    }
                ])
            }
        }
    };

    const deleteImage = (index) => {
        setImages((prevImages) => 
            prevImages.filter((_, i) => i !== index)
        );
    };

    const onDragOver = (event) => {
        event.preventDefault();
        setIsDragging(true);
        event.dataTransfer.dropEffect = "copy";
    }

    const onDragLeave = (event) => {
        event.preventDefault();
        setIsDragging(false);
    };

    const onDrop = (event) => {
        event.preventDefault();
        setIsDragging(false);
        const files = event.dataTransfer.files;

        if (files.length === 0) return;
        for (let i = 0; i < files.length; i++) {
            if (files[i].type.split('/')[0] !== 'image') continue;
            if (!images.some((e) => e.name === files[i].name)) {
                setImages((prevImages) => [
                    ...prevImages,
                    {
                        name: files[i].name,
                        url: URL.createObjectURL(files[i]),
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
            <div className={styles.top}>
                <p>Drag & Drop Image uploading</p>
            </div>
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
                            Drag & Drop image here or {" "}
                            <span className={styles.select} role='button' onClick={selectFiles}>
                                Browser
                            </span></>
                    )
                }
                <input
                    name='file'
                    type='file'
                    className={styles.file}
                    multiple
                    ref={fileInputRef}
                    onChange={onFileSelect}
                />
            </div>
            <div className={styles.container}>
                {
                    images.map((images, index) => (
                        <div className={styles.image} key={index}>
                            <span className={styles.delete} onClick={() => deleteImage(index)}>&times;</span>
                            <img src={images.url} alt={images.name} />
                        </div>
                    ))
                }
            </div>
            <button type='button' onClick={uploadImage}>
                upload
            </button>
        </div>
    )
};

export default DragDropImageUploader;