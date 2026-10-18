/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Company Context - Directory Data Management Engine
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Company, Category, City, SolidarityCampaign, Professional, Job, BlogPost, Coupon } from '../types';
import { CompanyRepository } from '../repositories/companyRepository';
import { CategoryRepository } from '../repositories/categoryRepository';
import { apiFetch } from '../lib/apiClient';

interface CompanyContextType {
  companies: Company[];
  categories: Category[];
  cities: City[];
  campaigns: SolidarityCampaign[];
  professionals: Professional[];
  jobs: Job[];
  posts: BlogPost[];
  coupons: Coupon[];
  selectedCityId: string;
  setSelectedCityId: (id: string) => void;
  searchWord: string;
  setSearchWord: (word: string) => void;
  searchCatId: string;
  setSearchCatId: (catId: string) => void;
  favorites: string[];
  toggleFavorite: (companyId: string) => void;
  refreshData: () => Promise<void>;
  loading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [campaigns, setCampaigns] = useState<SolidarityCampaign[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [searchWord, setSearchWord] = useState('');
  const [searchCatId, setSearchCatId] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    setLoading(true);
    try {
      const toArray = (v: unknown): any[] =>
        Array.isArray(v) ? v : Array.isArray((v as any)?.data) ? (v as any).data : [];

      const [fetchedCompanies, fetchedCategories] = await Promise.all([
        CompanyRepository.getAll(),
        CategoryRepository.getAll()
      ]);
      setCompanies(toArray(fetchedCompanies));
      setCategories(toArray(fetchedCategories));

      const fetchEndpoint = async (url: string) => {
        try {
          const res = await apiFetch(url);
          if (res.ok) {
            const raw = await res.json();
            return toArray(raw);
          }
        } catch {
          // ignore
        }
        return [];
      };

      fetchEndpoint('/api/cities').then(data => {
        setCities(data);
        if (data.length > 0 && !selectedCityId) setSelectedCityId(data[0].id);
      });
      fetchEndpoint('/api/campaigns').then(setCampaigns);
      fetchEndpoint('/api/professionals').then(setProfessionals);
      fetchEndpoint('/api/jobs').then(setJobs);
      fetchEndpoint('/api/blog').then(setPosts);
      fetchEndpoint('/api/coupons').then(setCoupons);
    } catch (err) {
      console.error('Error refreshing directory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    const savedFavs = localStorage.getItem('user_favorites');
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (err) {
        // ignore
      }
    }
  }, []);

  const toggleFavorite = (companyId: string) => {
    setFavorites(prev => {
      const next = prev.includes(companyId) 
        ? prev.filter(id => id !== companyId) 
        : [...prev, companyId];
      localStorage.setItem('user_favorites', JSON.stringify(next));
      return next;
    });
  };

  return (
    <CompanyContext.Provider
      value={{
        companies,
        categories,
        cities,
        campaigns,
        professionals,
        jobs,
        posts,
        coupons,
        selectedCityId,
        setSelectedCityId,
        searchWord,
        setSearchWord,
        searchCatId,
        setSearchCatId,
        favorites,
        toggleFavorite,
        refreshData,
        loading
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
