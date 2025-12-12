import { useState, useEffect, useCallback, useRef } from 'react';
import { AutoComplete, Spin, Divider, Button } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import debounce from 'lodash/debounce';
import { apiService } from '../services/ApiService';

interface Category {
  uuid: string;
  name: string;
  type: string;
}

interface PaginatedResponse {
  data: Category[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface Props {
  value?: string;
  onChange?: (value: string, isNew: boolean, categoryUuid?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  categoryType?: 'INCOME' | 'EXPENSE' | 'BOTH';
  pageSize?: number;
}

export default function CategorySelect({
  value,
  onChange,
  placeholder = 'Cerca o crea categoria...',
  disabled = false,
  style,
  className,
  categoryType,
  pageSize = 10,
}: Props) {
  const [options, setOptions] = useState<{ value: string; label: string; uuid?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const fetchRef = useRef(0);

  const fetchOptions = useCallback(
    async (search: string, pageNum: number) => {
      fetchRef.current += 1;
      const fetchId = fetchRef.current;

      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: search,
          page: String(pageNum),
          pageSize: String(pageSize),
        });

        if (categoryType) {
          params.set('type', categoryType);
        }

        const response = await apiService.get<PaginatedResponse>(
          `/categories/search?${params.toString()}`
        );

        if (fetchId !== fetchRef.current) return;

        const newOptions = response.data.map((cat) => ({
          value: cat.name,
          label: cat.name,
          uuid: cat.uuid,
        }));

        setOptions(newOptions);
        setTotalPages(response.totalPages);
        setTotal(response.total);
        setPage(response.page);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        if (fetchId === fetchRef.current) {
          setLoading(false);
        }
      }
    },
    [pageSize, categoryType]
  );

  const debouncedFetch = useCallback(
    debounce((search: string) => {
      setPage(1);
      fetchOptions(search, 1);
    }, 300),
    [fetchOptions]
  );

  useEffect(() => {
    fetchOptions('', 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryType || '']);

  const handleSearch = (search: string) => {
    setSearchText(search);
    debouncedFetch(search);
  };

  const handleSelect = (selectedValue: string) => {
    const option = options.find((opt) => opt.value === selectedValue);
    if (option?.uuid) {
      // Categoria esistente
      onChange?.(selectedValue, false, option.uuid);
    } else {
      // Nuova categoria (testo digitato)
      onChange?.(selectedValue, true);
    }
  };

  const handleChange = (newValue: string) => {
    setSearchText(newValue);
    // Quando l'utente digita, consideriamo che potrebbe essere una nuova categoria
    const option = options.find((opt) => opt.value.toLowerCase() === newValue.toLowerCase());
    if (option?.uuid) {
      onChange?.(newValue, false, option.uuid);
    } else {
      onChange?.(newValue, true);
    }
  };

  const handlePrevPage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (page > 1) {
      const newPage = page - 1;
      setPage(newPage);
      fetchOptions(searchText, newPage);
    }
  };

  const handleNextPage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (page < totalPages) {
      const newPage = page + 1;
      setPage(newPage);
      fetchOptions(searchText, newPage);
    }
  };

  const dropdownRender = (menu: React.ReactNode) => (
    <div>
      {loading ? (
        <div style={{ padding: '8px', textAlign: 'center' }}>
          <Spin size="small" />
        </div>
      ) : (
        menu
      )}
      {totalPages > 1 && (
        <>
          <Divider style={{ margin: '4px 0' }} />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 8px',
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <Button
              size="small"
              icon={<LeftOutlined />}
              disabled={page <= 1}
              onClick={handlePrevPage}
            />
            <span style={{ fontSize: 12, color: '#888' }}>
              {page} / {totalPages} ({total})
            </span>
            <Button
              size="small"
              icon={<RightOutlined />}
              disabled={page >= totalPages}
              onClick={handleNextPage}
            />
          </div>
        </>
      )}
      {searchText && !options.some((opt) => opt.value.toLowerCase() === searchText.toLowerCase()) && (
        <>
          <Divider style={{ margin: '4px 0' }} />
          <div style={{ padding: '4px 12px', color: '#52c41a', fontSize: 12 }}>
            Premi Invio per creare "{searchText}"
          </div>
        </>
      )}
    </div>
  );

  return (
    <AutoComplete
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      style={style}
      className={className}
      options={options}
      onSearch={handleSearch}
      onSelect={handleSelect}
      onChange={handleChange}
      popupRender={dropdownRender}
      onOpenChange={(open) => {
        if (open) {
          fetchOptions(searchText, page);
        }
      }}
      filterOption={false}
      allowClear
      notFoundContent={loading ? <Spin size="small" /> : 'Nessuna categoria trovata'}
    />
  );
}
