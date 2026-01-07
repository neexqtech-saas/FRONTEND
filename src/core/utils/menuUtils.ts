import { SidebarDataTest } from '../common/sidebarMenu';

/**
 * Extract all menu items (base keys) from sidebar data recursively
 */
export const getAllMenuItems = (): Array<{ base: string; label: string; path: string[] }> => {
  const menuItems: Array<{ base: string; label: string; path: string[] }> = [];
  
  const extractItems = (items: any[], path: string[] = []) => {
    items.forEach((item) => {
      if (item.base) {
        menuItems.push({
          base: item.base,
          label: item.label || '',
          path: [...path, item.label || item.base]
        });
      }
      
      if (item.submenuItems && Array.isArray(item.submenuItems)) {
        extractItems(item.submenuItems, [...path, item.label || item.base]);
      }
    });
  };
  
  SidebarDataTest.forEach((section) => {
    if (section.submenuItems) {
      extractItems(section.submenuItems);
    }
  });
  
  return menuItems;
};

/**
 * Check if a menu item should be visible based on role
 * @param item - Menu item object
 * @param userRole - Current user role
 * @returns boolean - true if item should be visible
 */
const isItemVisibleByRole = (item: any, userRole: string | null): boolean => {
  // If item has allowedRoles, check if user role is in the list
  if (item.allowedRoles && Array.isArray(item.allowedRoles)) {
    if (!userRole) return false;
    return item.allowedRoles.includes(userRole);
  }
  
  // If no role restriction, item is visible
  return true;
};

/**
 * Check if menu item is enabled
 */
const isMenuEnabled = (
  menuItemValue: boolean | undefined
): boolean => {
  // If no setting, default to enabled (backward compatibility)
  if (menuItemValue === undefined) {
    return true;
  }
  
  return menuItemValue === true;
};

/**
 * Filter menu items based on enabled_menu_items settings and role
 * Only show items that are explicitly set to true in enabled_menu_items
 * For parent menus with submenuItems, show if at least one child is enabled
 * For leaf items, check the item's base key
 * Also filters by role if allowedRoles is specified
 */
export const filterMenuItems = (
  items: any[],
  enabledMenuItems: Record<string, boolean> = {},
  userRole: string | null = null
): any[] => {
  return items
    .map((item) => {
      // First check role-based visibility (from allowedRoles in menu definition)
      if (!isItemVisibleByRole(item, userRole)) {
        return null;
      }
      
      // If item has submenuItems, check children first
      if (item.submenuItems && Array.isArray(item.submenuItems)) {
        const filteredSubmenu = filterMenuItems(item.submenuItems, enabledMenuItems, userRole);
        
        // If parent menu has no enabled submenu items, hide the parent too
        if (filteredSubmenu.length === 0) {
          return null;
        }
        
        // Parent menu is shown if it has at least one enabled child
        return {
          ...item,
          submenuItems: filteredSubmenu
        };
      }
      
      // For leaf items (no submenuItems), check if base is enabled
      // If enabledMenuItems is empty, show all items (backward compatibility)
      if (item.base && enabledMenuItems && Object.keys(enabledMenuItems).length > 0) {
        const menuItemValue = enabledMenuItems[item.base];
        const isEnabled = isMenuEnabled(menuItemValue);
        
        if (!isEnabled) {
          // If not enabled, return null to filter it out
          return null;
        }
      }
      
      return item;
    })
    .filter((item) => item !== null);
};

/**
 * Get filtered sidebar data based on enabled menu items and user role
 * Only shows items that are explicitly set to true in enabled_menu_items
 * Also filters by role if allowedRoles is specified on menu items
 */
export const getFilteredSidebarData = (
  enabledMenuItems: Record<string, boolean> = {},
  userRole: string | null = null
) => {
  return SidebarDataTest.map((section) => {
    if (section.submenuItems) {
      const filteredSubmenu = filterMenuItems(section.submenuItems, enabledMenuItems, userRole);
      
      // If section has no enabled submenu items, filter out the entire section
      if (filteredSubmenu.length === 0) {
        return null;
      }
      
      return {
        ...section,
        submenuItems: filteredSubmenu
      };
    }
    return section;
  }).filter((section) => section !== null);
};
