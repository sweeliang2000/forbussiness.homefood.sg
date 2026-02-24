'use client';
import { useParams } from 'next/navigation';
import HistoryDetailView from './HistoryDetail';

export default function HistoryDetailPage() {
    const params = useParams();
    const historyId = params?.history_id ?? null;

    return <HistoryDetailView historyId={historyId} />;
}
