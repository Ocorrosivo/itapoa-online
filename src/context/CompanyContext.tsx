/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Company Context - Directory Data Management Engine
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Company, Category, City, SolidarityCampaign, Professional, Job, BlogPost, Coupon } from '../types';
import { CompanyRepository } from '../repositories/companyRepository';
import { CategoryRepository } from '../repositories/categoryRepository';
import { apiFetch } from '../lib/apiClient';
import { arrayFromPayload } from '../utils/catalogSearch';

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
  catalogError: string | null;
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
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const refreshVersion = useRef(0);

  const refreshData = async () => {
    const version = ++refreshVersion.current;
    setLoading(true);
    setCatalogError(null);
    try {
      const fetchEndpoint = async (url: string) => {
        try {
          const res = await apiFetch(url);
          if (res.ok) {
            const raw = await res.json();
            return arrayFromPayload<any>(raw);
          }
        } catch {
          // ignore
        }
        return [];
      };

      const [fetchedCompanies, fetchedCategories, cityData, campaignData,
        professionalData, jobData, postData, couponData] = await Promise.all([
        CompanyRepository.getAll(), CategoryRepository.getAll(),
        fetchEndpoint('/api/cities'), fetchEndpoint('/api/campaigns'),
        fetchEndpoint('/api/professionals'), fetchEndpoint('/api/jobs'),
        fetchEndpoint('/api/blog'), fetchEndpoint('/api/coupons')
      ]);
      if (version !== refreshVersion.current) return;
      setCompanies(fetchedCompanies);
      setCategories(fetchedCategories);
      setCities(cityData);
      setSelectedCityId(current => current || cityData[0]?.id || '');
      setCampaigns(campaignData);
      setProfessionals(professionalData);
      setJobs(jobData);
      setPosts(postData);
      setCoupons(couponData);
    } catch (err) {
      if (version === refreshVersion.current) {
        setCatalogError('O catálogo está temporariamente indisponível. Tente novamente.');
      }
    } finally {
      if (version === refreshVersion.current) setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    let savedFavs: string | null = null;
    try { savedFavs = localStorage.getItem('user_favorites'); } catch { /* private mode */ }
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
        loading,
        catalogError
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
