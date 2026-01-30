import { Suspense } from 'react';
import Rewards from "./rewards";
import LoadingPage from '@/components/LoadingPage/LoadingPage';

const Page = () => {
    return (
        <Suspense fallback={<LoadingPage />}>
            <Rewards />
        </Suspense>
    );
};

export default Page;