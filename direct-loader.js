// Direct data loader for AI Python Libraries
document.addEventListener('DOMContentLoaded', function() {
  // Google Sheets URLs
  const ITEMS_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSHHCGDLX5wuhG7HzMtzs9Sh_mvKKMBCxR4lQnmgVE77dxbWj65lk3-fAGMqUF45xp4FYA6J1Y_A4Ak/pub?gid=368833303&single=true&output=csv";
  const CATEGORIES_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSHHCGDLX5wuhG7HzMtzs9Sh_mvKKMBCxR4lQnmgVE77dxbWj65lk3-fAGMqUF45xp4FYA6J1Y_A4Ak/pub?gid=1604699992&single=true&output=csv";
  
  // Parse CSV to array of objects
  function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(header => header.trim().replace(/^"(.+)"$/, '$1'));
    
    return lines.slice(1).map(line => {
      // Handle quoted fields with commas inside
      const values = [];
      let inQuote = false;
      let currentValue = '';
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
          inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
          values.push(currentValue.trim().replace(/^"(.+)"$/, '$1'));
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      
      // Add the last value
      values.push(currentValue.trim().replace(/^"(.+)"$/, '$1'));
      
      // Create object with headers as keys
      const obj = {};
      headers.forEach((header, index) => {
        obj[header.toLowerCase()] = values[index] || '';
      });
      
      return obj;
    });
  }
  
  // Function to get URL parameter or path segment
  function getCategoryFromUrl() {
    // Check for path-based category (e.g., /categories/chatbots/)
    const pathSegments = window.location.pathname.split('/').filter(segment => segment);
    
    if (pathSegments.length >= 2 && pathSegments[0] === 'categories') {
      return pathSegments[1];
    }
    
    // Fallback to query parameter
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('category') || '';
  }
  
  // Convert kebab-case to Title Case
  function formatCategoryName(category) {
    return category.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  // Normalize category string for comparison
  function normalizeCategory(category) {
    return category.toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
  
  // Check if an item belongs to a category
  function itemMatchesCategory(item, categoryName) {
    if (!item.category) return false;
    
    const normalizedItemCategories = item.category.split(';').map(c => normalizeCategory(c));
    const normalizedCategory = normalizeCategory(categoryName);
    
    // Direct category match
    const directMatch = normalizedItemCategories.some(cat => 
      cat === normalizedCategory || 
      cat.includes(normalizedCategory) || 
      normalizedCategory.includes(cat)
    );
    
    if (directMatch) return true;
    
    // Special cases handling
    const categoryLower = categoryName.toLowerCase();
    if (categoryLower === 'chatbots' && 
        (item.category.toLowerCase().includes('chatbot') || 
        item.category.toLowerCase().includes('natural language'))) {
      return true;
    }
    
    if (categoryLower === 'web scraping' && 
        (item.category.toLowerCase().includes('scraping') || 
        item.category.toLowerCase().includes('extraction'))) {
      return true;
    }
    
    return false;
  }
  
  // Main loader function
  async function loadCategoryData() {
    const categorySlug = getCategoryFromUrl();
    if (!categorySlug) return;
    
    const categoryName = formatCategoryName(categorySlug);
    console.log('Loading category data for:', categoryName);
    
    try {
      // Show loading message
      const itemsList = document.querySelector('.directory-01__items');
      if (itemsList) {
        itemsList.innerHTML = '<li style="text-align: center; padding: 20px;">Loading items for ' + categoryName + '...</li>';
      }
      
      // Update page title and heading
      document.title = categoryName + " - AI Python Libraries";
      
      const heading = document.querySelector('.directory-01__heading');
      if (heading) {
        heading.textContent = 'Explore ' + categoryName + ' Libraries';
      }
      
      // Fetch and parse items data
      console.log('Fetching items data from:', ITEMS_SHEET_URL);
      const itemsResponse = await fetch(ITEMS_SHEET_URL);
      const itemsCSV = await itemsResponse.text();
      const allItems = parseCSV(itemsCSV);
      console.log('Loaded', allItems.length, 'items');
      
      // Fetch category details (for description)
      console.log('Fetching categories data from:', CATEGORIES_SHEET_URL);
      const categoriesResponse = await fetch(CATEGORIES_SHEET_URL);
      const categoriesCSV = await categoriesResponse.text();
      const allCategories = parseCSV(categoriesCSV);
      console.log('Loaded', allCategories.length, 'categories');
      
      // Find current category in categories list
      const categoryInfo = allCategories.find(cat => {
        if (cat.slugified_title && cat.slugified_title.toLowerCase() === categorySlug.toLowerCase()) {
          return true;
        }
        if (cat.title && normalizeCategory(cat.title) === normalizeCategory(categoryName)) {
          return true;
        }
        return false;
      });
      
      // Update subtitle with category description
      const subtitle = document.querySelector('.directory-01__subtitle');
      if (subtitle) {
        if (categoryInfo && categoryInfo.text) {
          subtitle.textContent = categoryInfo.text;
        } else {
          subtitle.textContent = `Libraries for ${categoryName.toLowerCase()} in Python. Find the right tools for your AI project.`;
        }
      }
      
      // Filter items by category
      const matchingItems = allItems.filter(item => itemMatchesCategory(item, categoryName));
      console.log(`Found ${matchingItems.length} items matching category '${categoryName}'`);
      
      // Update DOM with matching items
      if (itemsList) {
        itemsList.innerHTML = '';
        
        if (matchingItems.length > 0) {
          matchingItems.forEach(item => {
            const itemElement = document.createElement('li');
            itemElement.className = 'directory-item-parent';
            itemElement.dataset.filters = JSON.stringify({category: item.category || ''});
            
            // Create item HTML - matching the original item template format
            itemElement.innerHTML = `
              <div class="directory-01__item card-container sc-br-0_5">
                <a target="_blank" href="https://aipythonlibraries.com/tools/${item.page || item.title.toLowerCase()}">
                  <div class="directory-01__title-box">
                    <h3 class="title-text--inner directory-01__title def-16">${item.title}</h3>
                    <div class="directory-01__rating">
                      <span class="directory-01__rating-text content-text def-14">${item.rank || ''}</span>
                      <svg viewBox="0 0 16 16" height="16" width="16" class="directory-01__rating-icon">
                        <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"></path>
                      </svg>
                    </div>
                  </div>
                  <div class="directory-01__text content_box content-text def-14">
                    <p>${item.text || ''}</p>
                  </div>
                </a>
              </div>
            `;
            
            itemsList.appendChild(itemElement);
          });
        } else {
          // No matching items found
          itemsList.innerHTML = '<li style="text-align: center; padding: 20px;">No libraries found for ' + categoryName + ' category.</li>';
        }
        
        // Update search input
        const searchInput = document.querySelector('.directory-01__search-input');
        if (searchInput) {
          searchInput.placeholder = `Search among ${matchingItems.length} items`;
          searchInput.disabled = false;
        }
        
        // Remove loading state
        const directory = document.querySelector('.directory-01');
        if (directory) {
          directory.classList.remove('dir-is-loading');
        }
        
        // Update "no results" placeholder visibility
        const placeholder = document.querySelector('.directory-01__not-found-placeholder-container');
        if (placeholder) {
          placeholder.style.display = matchingItems.length > 0 ? 'none' : 'flex';
        }
      }
      
      // Create category filter buttons to match Unicorn Platform's interface
      const filterContainer = document.querySelector('.directory-01__tags-box');
      if (filterContainer) {
        filterContainer.innerHTML = '';
        
        // Get unique categories from items
        const uniqueCategories = new Set();
        allItems.forEach(item => {
          if (item.category) {
            const categories = item.category.split(';');
            categories.forEach(cat => uniqueCategories.add(cat.trim()));
          }
        });
        
        // Create and add filter buttons
        Array.from(uniqueCategories).sort().forEach(cat => {
          const button = document.createElement('button');
          button.className = 'directory-01__tag-button content-text def-14';
          button.textContent = cat;
          button.dataset.tag = cat;
          
          // Make current category button active
          if (normalizeCategory(cat) === normalizeCategory(categoryName)) {
            button.classList.add('is-selected');
          }
          
          filterContainer.appendChild(button);
        });
      }
      
    } catch (error) {
      console.error('Error loading category data:', error);
      
      // Show error message
      const itemsList = document.querySelector('.directory-01__items');
      if (itemsList) {
        itemsList.innerHTML = `<li style="text-align: center; padding: 20px; color: #e74c3c;">
          Error loading data: ${error.message}. Please try again later.
        </li>`;
      }
      
      // Remove loading state
      const directory = document.querySelector('.directory-01');
      if (directory) {
        directory.classList.remove('dir-is-loading');
      }
    }
  }
  
  // Start loading data
  loadCategoryData();
  
  // Debug function to show raw data (can be triggered from console)
  window.debugLibraryData = async function() {
    try {
      const itemsResponse = await fetch(ITEMS_SHEET_URL);
      const itemsText = await itemsResponse.text();
      console.log('Raw items data:', itemsText);
      
      const categoriesResponse = await fetch(CATEGORIES_SHEET_URL);
      const categoriesText = await categoriesResponse.text();
      console.log('Raw categories data:', categoriesText);
      
      return {
        items: parseCSV(itemsText),
        categories: parseCSV(categoriesText)
      };
    } catch (e) {
      console.error('Error in debug function:', e);
      return null;
    }
  };
}); 