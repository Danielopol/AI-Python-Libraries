// Category filtering script
document.addEventListener('DOMContentLoaded', function() {
    // Function to get URL parameters
    function getUrlParameter(name) {
      name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
      var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
      var results = regex.exec(location.search);
      return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }
    
    // Check if the URL path contains a category (e.g., /categories/web-scraping/)
    const pathSegments = window.location.pathname.split('/').filter(segment => segment);
    let categoryFromPath = '';
    
    if (pathSegments.length >= 2 && pathSegments[0] === 'categories') {
      categoryFromPath = pathSegments[1];
    }
    
    // Get category from URL parameter as fallback
    const categoryParam = categoryFromPath || getUrlParameter('category');
    
    if (categoryParam) {
      console.log('Processing category:', categoryParam);
      
      // Convert from url format (e.g., deep-learning) to display format (e.g., Deep Learning)
      const displayCategory = categoryParam.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Set page title to reflect the category
      document.title = displayCategory + " - AI Python Libraries";
      
      // Update directory data attributes to focus on this category
      const directoryElement = document.querySelector('.directory-01');
      if (directoryElement) {
        const filtersV2Attr = directoryElement.getAttribute('data-filtersv2');
        if (filtersV2Attr) {
          try {
            // Safely parse the filters JSON string (remove potential functions first if necessary)
            // Assuming the initial HTML might still have the function placeholder for now
            // A better fix would be to remove the function from the HTML entirely
            const cleanedFiltersV2Attr = filtersV2Attr.replace(/function\(\) \{.*?\}\(\)/g, '"PLACEHOLDER"');
            const filtersData = JSON.parse(
              cleanedFiltersV2Attr
                .replace(/&#39;/g, '"')
                .replace(/&quot;/g, '"')
            );
            
            // Update the showByFilters to use the current category
            if (filtersData && filtersData.items && filtersData.items[0]) {
              // Find the filter item for 'category' and update its showByFilters
              const categoryFilterItem = filtersData.items.find(item => item.column === 'category');
              if (categoryFilterItem && categoryFilterItem.showByFilters) {
                  categoryFilterItem.showByFilters.items = displayCategory;
                  console.log('Updated category filter item:', categoryFilterItem);
              } else {
                  console.warn('Could not find category filter item in filtersV2 data to update.');
              }
              
              // Update the attribute with the modified data (optional, might not be needed if Alpine uses the parsed object)
              // const updatedFiltersAttr = JSON.stringify(filtersData).replace(/"/g, '&#39;');
              // directoryElement.setAttribute('data-filtersv2', updatedFiltersAttr);
              
              // Make the parsed/updated data available for Alpine if possible (depends on UP setup)
              // This might involve dispatching an event or directly modifying an Alpine data store
              // For now, we rely on category_script.js's own filtering fallback or button clicking

              console.log('Successfully parsed and updated filters logic in category_script.js for category:', displayCategory);
            } else {
              console.warn('Parsed filtersData seems invalid:', filtersData);
            }
          } catch (e) {
            console.error('Error parsing or updating filters in category_script.js:', e, 'Original attribute:', filtersV2Attr);
          }
        }
      }
      
      // Check for Alpine.js load and wait for directory to be ready
      const maxWaitTime = 10000; // 10 seconds maximum wait
      const startTime = Date.now();
      
      function waitForDirectoryLoad() {
        if (Date.now() - startTime > maxWaitTime) {
          console.log('Timeout waiting for directory to load, proceeding with direct filtering');
          applyDirectFiltering();
          return;
        }
        
        if (window.Alpine && document.querySelector('.directory-01') && 
            !document.querySelector('.directory-01').classList.contains('dir-is-loading')) {
          
          // Set the heading to show the category
          const heading = document.querySelector('.directory-01__heading');
          if (heading) {
            heading.textContent = 'Explore ' + displayCategory + ' Libraries';
            console.log('Updated heading to:', heading.textContent);
          }
          
          // Try to find and click the category filter button
          setTimeout(function() {
            const filterButtons = document.querySelectorAll('.directory-01__tag-button');
            let foundButton = false;
            
            filterButtons.forEach(button => {
              const buttonText = button.textContent.trim().toLowerCase();
              const categoryText = displayCategory.toLowerCase();
              
              if (buttonText === categoryText) {
                console.log('Found and clicking category button:', buttonText);
                button.click();
                foundButton = true;
              }
            });
            
            // If no button was found, apply direct filtering
            if (!foundButton) {
              console.log('No matching filter button found, applying direct filtering');
              applyDirectFiltering();
            }
          }, 1000);
        } else {
          // Keep waiting
          setTimeout(waitForDirectoryLoad, 100);
        }
      }
      
      // Function to apply direct DOM filtering on items
      function applyDirectFiltering() {
        const directoryItems = document.querySelectorAll('.directory-item-parent');
        console.log('Applying direct filtering on', directoryItems.length, 'items');
        
        if (directoryItems.length === 0) {
          // Try again after a short delay if no items found yet
          setTimeout(applyDirectFiltering, 500);
          return;
        }
        
        let categoryFound = false;
        const categoryLower = displayCategory.toLowerCase();
        
        directoryItems.forEach(item => {
          try {
            // Get category data from various sources
            let itemCategory = '';
            
            // Try dataset.filters attribute first
            if (item.dataset.filters) {
              try {
                const filtersData = JSON.parse(item.dataset.filters);
                itemCategory = filtersData.category || '';
              } catch (e) {
                console.warn('Error parsing item filters:', e);
              }
            }
            
            // Also check title and description
            const itemTitle = item.querySelector('.directory-01__title')?.textContent?.toLowerCase() || '';
            const itemText = item.querySelector('.directory-01__text')?.textContent?.toLowerCase() || '';
            
            // Check if this item matches the category
            const matchesCategory = 
              itemCategory.toLowerCase().includes(categoryLower) ||
              itemTitle.includes(categoryLower) ||
              itemText.includes(categoryLower);
            
            // Special case for web-scraping
            const isWebScraping = categoryParam === 'web-scraping' && 
              (itemText.includes('scraping') || 
               itemText.includes('extraction') ||
               itemText.includes('web mining'));
            
            // Show/hide based on matching
            if (matchesCategory || isWebScraping) {
              item.style.display = 'block';
              categoryFound = true;
            } else {
              item.style.display = 'none';
            }
          } catch (e) {
            console.error('Error processing item:', e);
          }
        });
        
        // If no items were found for this category, try one more time after data may have loaded
        if (!categoryFound) {
          setTimeout(() => {
            // One final attempt if new items have been added to the DOM
            const newItems = document.querySelectorAll('.directory-item-parent');
            if (newItems.length > directoryItems.length) {
              applyDirectFiltering();
            }
          }, 2000);
        }
      }
      
      // Start the process
      waitForDirectoryLoad();
      
      // Also set up a mutation observer to catch newly added items
      const directoryItemsList = document.querySelector('.directory-01__items');
      if (directoryItemsList) {
        const observer = new MutationObserver(function(mutations) {
          console.log('Directory items changed, reapplying filtering');
          applyDirectFiltering();
        });
        
        observer.observe(directoryItemsList, { childList: true });
      }
    }
  });

