"use client";
import styles from "./page.module.css";

export default function Home() {
  const { isAuthenticated, isloading } = useAuth();

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Login Status</h1>
      </main>
    </div>
  );
}
