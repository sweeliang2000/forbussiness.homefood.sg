'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './HeroSection.module.css';

const TransactionChart = () => {
    // Sample data showing transaction growth
    const data = [
        { month: 'Jan', transactions: 4200 },
        { month: 'Feb', transactions: 3800 },
        { month: 'Mar', transactions: 5100 },
        { month: 'Apr', transactions: 6800 },
        { month: 'May', transactions: 8200 },
        { month: 'Jun', transactions: 11000 },
        { month: 'Jul', transactions: 9500 },
        { month: 'Aug', transactions: 11200 },
        { month: 'Sep', transactions: 12800 },
    ];

    return (
        <div className={styles.chartContainer}>
            <div className={styles.chartHeader}>
                <div>
                    <h3 className={styles.chartTitle}>Transaction</h3>
                    <p className={styles.chartSubtitle}>Target Goal</p>
                </div>
                <div className={styles.chartStats}>
                    <span className={styles.percentageBadge}>+2.5%</span>
                </div>
            </div>
            <div className={styles.chartWrapper}>
                <div className={styles.chartResponsive}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 5, left: -32, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis 
                            dataKey="month" 
                            tick={{ fill: '#666', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis 
                            tick={{ fill: '#666', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: '#fff', 
                                border: 'none', 
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                            formatter={(value) => [value.toLocaleString(), 'Transactions']}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="transactions" 
                            stroke="#6366f1" 
                            strokeWidth={3}
                            dot={{ fill: '#6366f1', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default TransactionChart;

