import React from 'react';
import { Company } from '../types';
import CompaniesTable from './CompaniesTable';
import CompanySummary from './CompanySummary';

interface CompaniesPageProps {
    isDarkMode: boolean;
    companies: Company[];
    onAddCompany: () => void;
    onEditCompany: (company: Company) => void;
    onDeleteCompany: (id: string) => void;
}

const CompaniesPage: React.FC<CompaniesPageProps> = ({
    isDarkMode,
    companies,
    onAddCompany,
    onEditCompany,
    onDeleteCompany
}) => {
    return (
        <main className="px-8 pb-5 pt-4 space-y-6 max-w-[1800px] mx-auto w-full h-full flex flex-col">
            {/* Breadcrumbs & Title */}
            <div className="space-y-1 mb-2 flex-shrink-0">
                <div className={`flex items-center text-xs font-medium space-x-2 ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>
                    <span className={`cursor-pointer transition-colors ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-slate-800'}`}>Home Page</span>
                    <span>/</span>
                    <span className={isDarkMode ? 'text-gray-400' : 'text-slate-400'}>Income Tracker</span>
                    <span>/</span>
                    <span className={isDarkMode ? 'text-gray-400' : 'text-slate-400'}>Companies</span>
                </div>
                <h1 className={`text-3xl font-light tracking-wide ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Companies</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 pb-6">
                {/* Left Column: Companies Table */}
                <div className="lg:col-span-8 flex flex-col h-full min-h-0">
                    <CompaniesTable
                        companies={companies}
                        isDarkMode={isDarkMode}
                        onAddCompany={onAddCompany}
                        onEditCompany={onEditCompany}
                        onDeleteCompany={onDeleteCompany}
                    />
                </div>

                {/* Right Column: Summary */}
                <div className="lg:col-span-4 flex flex-col h-full min-h-0">
                    <CompanySummary companies={companies} isDarkMode={isDarkMode} />
                </div>
            </div>
        </main>
    );
};

export default CompaniesPage;
