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
  
  // Main loader function
  async function loadCategoryData() {
    const categorySlug = getCategoryFromUrl();
    if (!categorySlug) return;
    
    const categoryName = formatCategoryName(categorySlug);
    console.log('Loading data for category:', categoryName);
    
    // Update page title and heading
    document.title = categoryName + " - AI Python Libraries";
    
    const heading = document.querySelector('.directory-01__heading');
    if (heading) {
      heading.textContent = 'Explore ' + categoryName + ' Libraries';
    }
    
    try {
      // Fetch and parse items data
      const itemsResponse = await fetch(ITEMS_SHEET_URL);
      const itemsCSV = await itemsResponse.text();
      const allItems = parseCSV(itemsCSV);
      
      // Fetch and parse categories data (for descriptions)
      const categoriesResponse = await fetch(CATEGORIES_SHEET_URL);
      const categoriesCSV = await categoriesResponse.text();
      const allCategories = parseCSV(categoriesCSV);
      
      // Find category description
      const categoryInfo = allCategories.find(cat => 
        cat.slugified_title === categorySlug || 
        cat.title.toLowerCase() === categoryName.toLowerCase()
      );
      
      // Update subtitle with category description
      const subtitle = document.querySelector('.directory-01__subtitle');
      if (subtitle && categoryInfo && categoryInfo.text) {
        subtitle.textContent = categoryInfo.text;
      } else if (subtitle) {
        subtitle.textContent = `Libraries for ${categoryName.toLowerCase()} in Python. Find the right tools for your AI project.`;
      }
      
      // Filter items by category
      const matchingItems = allItems.filter(item => {
        if (!item.category) return false;
        
        // Check if item category matches current category
        const categoryLower = categoryName.toLowerCase();
        const itemCategory = item.category.toLowerCase();
        
        // Direct match
        if (itemCategory.includes(categoryLower)) return true;
        
        // Handle special cases
        if (categorySlug === 'chatbots' && (
          itemCategory.includes('chatbot') || 
          itemCategory.includes('natural language processing') || 
          itemCategory.includes('nlp'))) {
          return true;
        }
        
        if (categorySlug === 'web-scraping' && (
          itemCategory.includes('scraping') || 
          itemCategory.includes('web mining') || 
          itemCategory.includes('extraction'))) {
          return true;
        }
        
        return false;
      });
      
      console.log(`Found ${matchingItems.length} items for category ${categoryName}`);
      
      // Clear loading indicator and populate items
      const itemsList = document.querySelector('.directory-01__items');
      if (itemsList) {
        itemsList.innerHTML = '';
        
        if (matchingItems.length > 0) {
          matchingItems.forEach(item => {
            const itemElement = document.createElement('li');
            itemElement.className = 'directory-item-parent';
            itemElement.dataset.filters = JSON.stringify({category: item.category || ''});
            
            // Create item HTML
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
          itemsList.innerHTML = '<li style="text-align: center; padding: 20px;">No libraries found for this category.</li>';
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
    } catch (error) {
      console.error('Error loading category data:', error);
      
      // Show error message
      const itemsList = document.querySelector('.directory-01__items');
      if (itemsList) {
        itemsList.innerHTML = `<li style="text-align: center; padding: 20px; color: #e74c3c;">
          Error loading data. Please try again later.
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
}); 