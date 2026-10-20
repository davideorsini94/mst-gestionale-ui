import { useState, useEffect, useCallback, useRef } from 'react';
import { Select, Spin, Divider, Button, theme } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import debounce from 'lodash/debounce';
import { apiService } from '../services/ApiService';

interface Option {
  value: string;
  label: string;
  [key: string]: any;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface Props {
  endpoint: string;
  value?: string;
  onChange?: (value: string | undefined, option?: Option) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  labelField?: string;
  valueField?: string;
  pageSize?: number;
  extraParams?: Record<string, string>;
  allowCreate?: boolean;
  onCreateNew?: (name: string) => void;
}

export default function SearchableSelect({
  endpoint,
  value,
  onChange,
  placeholder = 'Cerca...',
  allowClear = true,
  disabled = false,
  style,
  className,
  labelField = 'name',
  valueField = 'uuid',
  pageSize = 10,
  extraParams = {},
  allowCreate = false,
  onCreateNew,
}: Props) {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const fetchRef = useRef(0);
  const { token } = theme.useToken();

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
          ...extraParams,
        });

        const response = await apiService.get<PaginatedResponse<any>>(
          `${endpoint}?${params.toString()}`
        );

        if (fetchId !== fetchRef.current) return;

        const newOptions = response.data.map((item: any) => ({
          value: item[valueField],
          label: item[labelField],
          ...item,
        }));

        setOptions(newOptions);
        setTotalPages(response.totalPages);
        setTotal(response.total);
        setPage(response.page);
      } catch (error) {
        console.error('Error fetching options:', error);
      } finally {
        if (fetchId === fetchRef.current) {
          setLoading(false);
        }
      }
    },
    [endpoint, pageSize, extraParams, labelField, valueField]
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
  }, []);

  // Load selected option label if value is set but no option is selected
  useEffect(() => {
    if (value && !selectedOption) {
      // Try to find in current options
      const found = options.find((opt) => opt.value === value);
      if (found) {
        setSelectedOption(found);
      }
    }
  }, [value, options, selectedOption]);

  const handleSearch = (search: string) => {
    setSearchText(search);
    debouncedFetch(search);
  };

  const handleChange = (newValue: string | undefined) => {
    if (newValue === undefined) {
      setSelectedOption(null);
      onChange?.(undefined);
    } else {
      const option = options.find((opt) => opt.value === newValue);
      setSelectedOption(option || null);
      onChange?.(newValue, option);
    }
  };

  const handlePrevPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (page > 1) {
      const newPage = page - 1;
      setPage(newPage);
      fetchOptions(searchText, newPage);
    }
  };

  const handleNextPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (page < totalPages) {
      const newPage = page + 1;
      setPage(newPage);
      fetchOptions(searchText, newPage);
    }
  };

  const handleCreateNew = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (searchText && onCreateNew) {
      onCreateNew(searchText);
    }
  };

  const dropdownRender = (menu: React.ReactNode) => (
    <>
      {menu}
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
          >
            <Button
              size="small"
              aria-label="Pagina precedente"
              icon={<LeftOutlined />}
              disabled={page <= 1}
              onClick={handlePrevPage}
            />
            <span style={{ fontSize: 12, color: token.colorTextTertiary }}>
              {page} / {totalPages} ({total} totali)
            </span>
            <Button
              size="small"
              aria-label="Pagina successiva"
              icon={<RightOutlined />}
              disabled={page >= totalPages}
              onClick={handleNextPage}
            />
          </div>
        </>
      )}
      {allowCreate && searchText && !options.some((opt) => opt.label.toLowerCase() === searchText.toLowerCase()) && (
        <>
          <Divider style={{ margin: '4px 0' }} />
          <div style={{ padding: '4px 8px' }}>
            <Button
              type="link"
              size="small"
              onClick={handleCreateNew}
              style={{ width: '100%', textAlign: 'left' }}
            >
              + Crea "{searchText}"
            </Button>
          </div>
        </>
      )}
    </>
  );

  return (
    <Select
      showSearch
      value={value}
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabled}
      style={style}
      className={className}
      filterOption={false}
      onSearch={handleSearch}
      onChange={handleChange}
      notFoundContent={loading ? <Spin size="small" /> : 'Nessun risultato'}
      options={options}
      popupRender={dropdownRender}
      onOpenChange={(open) => {
        if (open) {
          fetchOptions(searchText, page);
        }
      }}
    />
  );
}
