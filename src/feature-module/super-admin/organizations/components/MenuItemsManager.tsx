import React, { useState, useEffect } from 'react';
import { getAllMenuItems } from '../../../../core/utils/menuUtils';

interface MenuItemsManagerProps {
  enabledMenuItems: Record<string, boolean>;
  onChange: (enabledMenuItems: Record<string, boolean>) => void;
}

const MenuItemsManager: React.FC<MenuItemsManagerProps> = ({
  enabledMenuItems,
  onChange,
}) => {
  const [menuItems, setMenuItems] = useState<Array<{ base: string; label: string; path: string[] }>>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Get all menu items
    const allItems = getAllMenuItems();
    setMenuItems(allItems);
  }, []);

  // Get menu item visibility
  const getVisibility = (base: string): boolean => {
    const item = enabledMenuItems[base];
    if (item === undefined) return true; // Default: enabled for all
    return item === true;
  };

  // Toggle menu item visibility
  const handleToggle = (base: string, enabled: boolean) => {
    const updated = {
      ...enabledMenuItems,
      [base]: enabled
    };
    onChange(updated);
  };

  const filteredItems = menuItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.base.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.path.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="menu-items-manager">
      <div className="mb-3">
        <label className="form-label fw-bold">
          <i className="ti ti-menu-2 me-2" />
          Sidebar Menu Items Control
        </label>
        <p className="text-muted small mb-2">
          Control which menu items are visible in the sidebar for all users.
        </p>
        <input
          type="text"
          className="form-control"
          placeholder="Search menu items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="table table-hover mb-0">
              <thead className="table-light sticky-top">
                <tr>
                  <th>Menu Item</th>
                  <th>Base Key</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>
                    <i className="ti ti-toggle-left me-1" />
                    Enabled
                  </th>
                  <th>Path</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-4">
                      No menu items found
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isEnabled = getVisibility(item.base);
                    
                    return (
                      <tr key={item.base}>
                        <td>
                          <span className={isEnabled ? '' : 'text-muted'}>
                            {item.label}
                          </span>
                        </td>
                        <td>
                          <code className="small">{item.base}</code>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="form-check form-switch d-inline-block">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) => handleToggle(item.base, e.target.checked)}
                              style={{ cursor: 'pointer' }}
                            />
                          </div>
                        </td>
                        <td>
                          <small className="text-muted">
                            {item.path.join(' > ')}
                          </small>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-3 d-flex justify-content-between align-items-center">
        <div className="text-muted small">
          Total: {menuItems.length} | 
          Enabled: {filteredItems.filter(item => getVisibility(item.base)).length}
        </div>
        <div>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary me-2"
            onClick={() => {
              const allEnabled: Record<string, boolean> = {};
              menuItems.forEach((item) => {
                allEnabled[item.base] = true;
              });
              onChange(allEnabled);
            }}
          >
            Enable All
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              const allDisabled: Record<string, boolean> = {};
              menuItems.forEach((item) => {
                allDisabled[item.base] = false;
              });
              onChange(allDisabled);
            }}
          >
            Disable All
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuItemsManager;
