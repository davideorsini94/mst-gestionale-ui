import { Button, Input, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

interface SearchBoxProps {
  /** testo nel campo (può essere diverso dalla ricerca applicata finché non si conferma) */
  value: string;
  onChange: (value: string) => void;
  /** conferma la ricerca: Invio, pulsante Cerca o ✕ (con stringa vuota) */
  onSearch: (value: string) => void;
  placeholder?: string;
  width?: number | string;
  size?: 'small' | 'middle' | 'large';
  ariaLabel?: string;
}

/**
 * Campo di ricerca con pulsante "Cerca".
 * Al posto di Input.Search (che usa internamente addonAfter, deprecato in antd 5.29): Space.Compact + Input.
 * Svuotando il campo (anche con la ✕) il filtro si toglie subito; il testo nuovo vale solo dopo Invio/Cerca.
 */
export default function SearchBox({
  value,
  onChange,
  onSearch,
  placeholder = 'Cerca…',
  width = 220,
  size = 'middle',
  ariaLabel = 'Cerca',
}: SearchBoxProps) {
  return (
    <Space.Compact style={{ width }} size={size} className="mst-search-box">
      <Input
        enterKeyHint="search"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        allowClear
        onChange={(e) => {
          onChange(e.target.value);
          // campo svuotato (✕ o cancellando il testo): il filtro si toglie subito
          if (e.target.value === '') onSearch('');
        }}
        onPressEnter={() => onSearch(value.trim())}
      />
      <Button icon={<SearchOutlined />} aria-label="Cerca" onClick={() => onSearch(value.trim())} />
    </Space.Compact>
  );
}
