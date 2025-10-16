document.addEventListener('DOMContentLoaded', () => {

    // --- GLOBAL VARIABLES AND INITIALIZATION ---
    let currentCourseData = null;
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    
    let usersCurrentPage = 1;
    let usersTotalPages = 1;
    const usersPageSize = 10;
    
    // --- ELEMENT REFERENCES ---
    // Tab switching elements
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // Prices tab elements
    const loadingMessage = document.getElementById('loading-message');
    const courseListEl = document.getElementById('course-list');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const createNewBtn = document.getElementById('create-new-btn');
    const createDailyRangesBtn = document.getElementById('create-daily-ranges-btn');
    const deleteDailyRangesBtn = document.getElementById('delete-daily-ranges-btn');

    // Users tab elements
    const usersTableBody = document.getElementById('usersTable').querySelector('tbody');
    const usersSearchInput = document.getElementById('usersSearchInput');
    const usersPrevBtn = document.getElementById('usersPrevBtn');
    const usersNextBtn = document.getElementById('usersNextBtn');
    const usersPageInfo = document.getElementById('usersPageInfo');

    // Multi-Delete elements (assuming HTML elements were added)
    const multiDeleteModal = document.getElementById('multiDeleteModal');
    const multiDeleteStartDate = document.getElementById('multiDeleteStartDate');
    const multiDeleteEndDate = document.getElementById('multiDeleteEndDate');
    const rangesToDeleteList = document.getElementById('rangesToDeleteList');
    const confirmMultiDeleteBtn = document.getElementById('confirmMultiDeleteBtn');

    // API Key
    const apiKey = localStorage.getItem('apiKey');
    // const API_URL_BASE = 'https://localhost:7294/BackOffice';
    const API_URL_BASE = 'https://golfclappapi.azurewebsites.net/BackOffice';

    // --- UTILITY FUNCTION FOR REFRESHING DATA ---
    const refreshCourseData = async () => {
        if (currentCourseData) {
            await fetchCourseList(apiKey, currentCourseData.course.id);
        } else {
            await fetchCourseList(apiKey);
        }
    }

    // --- TAB SWITCHING LOGIC ---
    const switchTab = (tabId) => {
        tabButtons.forEach(button => {
            if (button.dataset.tab === tabId) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        tabContents.forEach(content => {
            if (content.id === `${tabId}-content`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        if (tabId === 'usuarios') {
            fetchUsers();
        }
    };

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            switchTab(button.dataset.tab);
        });
    });

    // --- USERS TAB FUNCTIONS AND LISTENERS ---
    const fetchUsers = async () => {
        try {
            const searchTerm = usersSearchInput.value;
            const url = `${API_URL_BASE}/Users?pageNumber=${usersCurrentPage}&pageSize=${usersPageSize}&searchTerm=${searchTerm}`;
            
            const response = await fetch(url, {
                headers: {
                    'Api-Key': apiKey,
                },
            });
            
            if (!response.ok) {
                throw new Error('Network response for users was not ok');
            }
            const data = await response.json();

            renderUsers(data.items);
            usersTotalPages = data.totalPages;
            updateUsersPaginationUI();

        } catch (error) {
            console.error('Error fetching users:', error);
            usersTableBody.innerHTML = '<tr><td colspan="5">Error al cargar los usuarios. Por favor, intente de nuevo.</td></tr>';
            updateUsersPaginationUI();
        }
    };

    const renderUsers = (users) => {
        usersTableBody.innerHTML = '';
        if (users.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="5">No se encontraron usuarios.</td></tr>';
            return;
        }
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.surname}</td>
                <td>${user.userName}</td>
                <td>${user.email}</td>
                <td>${user.phoneNumber || ''}</td>
            `;
            usersTableBody.appendChild(row);
        });
    };

    const updateUsersPaginationUI = () => {
        usersPageInfo.textContent = `Página ${usersCurrentPage} de ${usersTotalPages}`;
        usersPrevBtn.disabled = usersCurrentPage <= 1;
        usersNextBtn.disabled = usersCurrentPage >= usersTotalPages;
    };

    usersPrevBtn.addEventListener('click', () => {
        if (usersCurrentPage > 1) {
            usersCurrentPage--;
            fetchUsers();
        }
    });

    usersNextBtn.addEventListener('click', () => {
        if (usersCurrentPage < usersTotalPages) {
            usersCurrentPage++;
            fetchUsers();
        }
    });

    usersSearchInput.addEventListener('input', () => {
        usersCurrentPage = 1;
        fetchUsers();
    });

    // --- PRICES TAB FUNCTIONS AND LISTENERS ---
    const fetchCourseList = async (userApiKey, courseIdToSelect = null) => {
        const url = `${API_URL_BASE}/GetPriceRanges`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Key': userApiKey,
                },
            });
            if (response.ok) {
                const data = await response.json();
                loadingMessage.style.display = 'none';
                
                // Clear existing course list
                courseListEl.innerHTML = '';
                
                if (data.length > 0) {
                    let courseToDisplay = courseIdToSelect 
                        ? data.find(c => c.course.id === courseIdToSelect) 
                        : data[0]; // Select requested course or first one
                    
                    if (!courseToDisplay) {
                        courseToDisplay = data[0]; // Fallback if requested course isn't found
                    }

                    currentCourseData = courseToDisplay;
                    document.getElementById('selected-course-name').textContent = `Price Ranges for: ${currentCourseData.course.name}`;
                    renderCalendar();
                } else {
                    currentCourseData = null; // No courses to display
                    document.getElementById('selected-course-name').textContent = 'No Courses Available';
                    renderCalendar(); // Render empty calendar
                }

                data.forEach(courseData => {
                    const listItem = document.createElement('li');
                    listItem.classList.add('course-list-item');
                    // Add 'active' class to the currently selected course
                    if (currentCourseData && courseData.course.id === currentCourseData.course.id) {
                        listItem.classList.add('active');
                    }
                    listItem.textContent = courseData.course.name;
                    listItem.dataset.courseId = courseData.course.id;
                    listItem.addEventListener('click', () => {
                        selectCourseAndRenderCalendar(courseData);
                        // Also update the active class on click
                        courseListEl.querySelectorAll('.course-list-item').forEach(item => item.classList.remove('active'));
                        listItem.classList.add('active');
                    });
                    courseListEl.appendChild(listItem);
                });
            } else {
                console.error('Failed to get course list:', response.status);
                loadingMessage.textContent = 'Failed to load courses.';
            }
        } catch (error) {
            console.error('Network or other error:', error);
            loadingMessage.textContent = 'An error occurred. Please try again.';
        }
    }

    function selectCourseAndRenderCalendar(courseData) {
        currentCourseData = courseData;
        document.getElementById('selected-course-name').textContent = `Price Ranges for: ${courseData.course.name}`;
        // Reset month and year to current month/year when selecting a new course
        currentMonth = new Date().getMonth(); 
        currentYear = new Date().getFullYear();
        renderCalendar();
        
        const calendarWrapper = document.getElementById('calendar-wrapper');
        calendarWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function stringToHslColor(str, s, l) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = hash % 360;
        return 'hsl(' + h + ', ' + s + '%, ' + l + '%)';
    }

    function renderCalendar() {
        if (!currentCourseData) return;

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const numDays = lastDay.getDate();

        const displayEl = document.querySelector('.calendar-container .calendar-header span');
        const gridEl = document.getElementById('calendar-grid');

        displayEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;

        // Clear only the days, leave the day names (first 7 children)
        while (gridEl.children.length > 7) { 
            gridEl.removeChild(gridEl.lastChild);
        }

        // Adjust for Sunday=0 to match the 7-column grid starting Monday or whatever
        const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0, Sunday = 6
        for (let i = 0; i < firstDayOfWeek; i++) {
            const blankDay = document.createElement('div');
            blankDay.classList.add('day');
            gridEl.appendChild(blankDay);
        }

        for (let day = 1; day <= numDays; day++) {
            const dayEl = document.createElement('div');
            dayEl.classList.add('day');
            dayEl.innerHTML = `<span class="day-number">${day}</span>`;
            
            dayEl.addEventListener('click', () => {
                openDayInfoModal(day);
            });

            const currentDateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            currentCourseData.priceRanges.forEach(priceRange => {
                const startDate = priceRange.startDate.split('T')[0];
                const endDate = priceRange.endDate.split('T')[0];
                
                if (currentDateString >= startDate && currentDateString <= endDate) {
                    const eventEl = document.createElement('div');
                    eventEl.classList.add('event');
                    eventEl.textContent = `€${(priceRange.price / 100).toFixed(2)}`;
                    
                    const priceKey = priceRange.price.toString();
                    eventEl.style.backgroundColor = stringToHslColor(priceKey, 70, 50);

                    eventEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openEditModal(priceRange);
                    });

                    dayEl.appendChild(eventEl);
                }
            });

            gridEl.appendChild(dayEl);
        }
        renderPriceSummary();
    }

    function renderPriceSummary() {
        const summaryListEl = document.getElementById('price-summary-list');
        summaryListEl.innerHTML = '';

        if (!currentCourseData || !currentCourseData.priceRanges) {
            summaryListEl.innerHTML = '<li>No price ranges available for this course.</li>';
            return;
        }

        const pricesForMonth = currentCourseData.priceRanges.filter(range => {
            const start = new Date(range.startDate);
            const end = new Date(range.endDate);
            
            const currentMonthStart = new Date(currentYear, currentMonth, 1);
            const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);

            return (start <= currentMonthEnd && end >= currentMonthStart);
        });
        
        pricesForMonth.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        if (pricesForMonth.length > 0) {
            pricesForMonth.forEach(range => {
                const listItem = document.createElement('li');
                listItem.classList.add('price-summary-item');
                
                listItem.priceRangeData = range;

                const priceKey = range.price.toString();
                const color = stringToHslColor(priceKey, 70, 50);

                // Reformatting to be more user-friendly
                const startDate = new Date(range.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric'}) + ' ' + new Date(range.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const endDate = new Date(range.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric'}) + ' ' + new Date(range.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                listItem.innerHTML = `
                    <span class="color-dot" style="background-color: ${color};"></span>
                    <strong>€${(range.price / 100).toFixed(2)}</strong>: ${startDate} - ${endDate}
                `;
                
                listItem.addEventListener('click', () => {
                    openEditModal(range);
                });

                summaryListEl.appendChild(listItem);
            });
        } else {
            summaryListEl.innerHTML = '<li>No price ranges for this month.</li>';
        }
    }
    
    // --- SINGLE PRICE RANGE CRUD (EDIT/CREATE/DELETE) ---

    function openEditModal(priceRange) {
        const modal = document.getElementById('editModal');
        const form = document.getElementById('editForm');
        const deleteBtn = document.getElementById('delete-btn');
        
        const isNew = priceRange === null;
        document.getElementById('editPriceRangeId').value = isNew ? '' : priceRange.id;
        document.getElementById('editCourseName').textContent = currentCourseData.course.name;
        document.getElementById('currentPriceDisplay').textContent = isNew ? 'N/A' : `€${(priceRange.price / 100).toFixed(2)}`;
        
        document.getElementById('newPrice').value = isNew ? '0.00' : (priceRange.price / 100).toFixed(2);
        
        deleteBtn.style.display = isNew ? 'none' : 'block';

        if (isNew) {
            const today = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(today.getDate() + 1);

            document.getElementById('startDate').value = today.toISOString().split('T')[0];
            document.getElementById('startTime').value = '00:00';
            document.getElementById('endDate').value = tomorrow.toISOString().split('T')[0];
            document.getElementById('endTime').value = '23:59';
        } else {
            const startDateObj = new Date(priceRange.startDate);
            const endDateObj = new Date(priceRange.endDate);
            
            // Note: This relies on browser's interpretation of the ISO string, which may not be pure UTC for time display
            const formatTime = (date) => date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

            document.getElementById('startDate').value = startDateObj.toISOString().split('T')[0];
            document.getElementById('startTime').value = formatTime(startDateObj);
            document.getElementById('endDate').value = endDateObj.toISOString().split('T')[0];
            document.getElementById('endTime').value = formatTime(endDateObj);
        }

        modal.style.display = 'block';

        deleteBtn.onclick = async () => {
            if (confirm('Are you sure you want to delete this price range?')) {
                await deletePriceRange(priceRange.id);
            }
        };
        
        form.onsubmit = async (event) => {
            event.preventDefault();
            
            const updatedPrice = parseFloat(document.getElementById('newPrice').value) * 100;
            const newDateStart = document.getElementById('startDate').value;
            const newTimeStart = document.getElementById('startTime').value;
            const newDateEnd = document.getElementById('endDate').value;
            const newTimeEnd = document.getElementById('endTime').value;
            let priceRangeId = document.getElementById('editPriceRangeId').value;
            
            // Format to ISO 8601 with Z for UTC assumption for the backend controller
            const updatedStartDate = `${newDateStart}T${newTimeStart}:00.000Z`;
            const updatedEndDate = `${newDateEnd}T${newTimeEnd}:00.000Z`;
            
            if (isNew) {
                // Generate a new ID for creation
                priceRangeId = crypto.randomUUID(); 
            }

            const updateData = {
                id: priceRangeId,
                price: updatedPrice,
                startDate: updatedStartDate,
                endDate: updatedEndDate,
                courseId: currentCourseData.course.id
            };
            
            const url = `${API_URL_BASE}/UpdatePriceRange`;
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Api-Key': apiKey,
                    },
                    body: JSON.stringify(updateData),
                });
                
                if (response.ok) {
                    alert('Price range saved successfully!');
                    closeModal();
                    await refreshCourseData(); 
                } else {
                    const error = await response.text();
                    alert('Failed to save price range: ' + error);
                }
            } catch (error) {
                alert('An error occurred while saving the price range.');
                console.error(error);
            }
        };
    }

    async function deletePriceRange(priceRangeId) {
        const url = `${API_URL_BASE}/DeletePriceRange?id=${priceRangeId}`;
        
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Api-Key': apiKey,
                },
            });

            if (response.ok) {
                alert('Price range deleted successfully!');
                closeModal();
                await refreshCourseData();
            } else {
                const error = await response.text();
                alert('Failed to delete price range: ' + error);
            }
        } catch (error) {
            alert('An error occurred while deleting the price range.');
            console.error(error);
        }
    }
    
    // --- DAILY RANGE CREATION LOGIC ---

    function openDailyRangeModal() {
        if (!currentCourseData) {
            alert('Please select a course first.');
            return;
        }

        const modal = document.getElementById('dailyRangeModal');
        const form = document.getElementById('dailyRangeForm');
        
        document.getElementById('dailyRangeCourseName').textContent = currentCourseData.course.name;

        // Set sensible defaults for the new range
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 7); // Default to a week-long range

        document.getElementById('dailyStartDate').value = today.toISOString().split('T')[0];
        document.getElementById('dailyEndDate').value = futureDate.toISOString().split('T')[0];
        document.getElementById('dailyStartTime').value = '09:00';
        document.getElementById('dailyEndTime').value = '17:00';
        document.getElementById('dailyPrice').value = '10.00'; 
        
        modal.style.display = 'block';

        // Set the submit handler
        form.onsubmit = submitDailyRangeForm;
    }

    async function submitDailyRangeForm(event) {
        event.preventDefault();

        const price = parseFloat(document.getElementById('dailyPrice').value);
        const startDate = document.getElementById('dailyStartDate').value;
        const endDate = document.getElementById('dailyEndDate').value;
        const startTime = document.getElementById('dailyStartTime').value;
        const endTime = document.getElementById('dailyEndTime').value;
        
        if (!currentCourseData) return;
        
        const requestData = {
            price: price * 100, // Send price in cents
            // Dates are sent in a standard format but the TIME is ignored by the C# controller's ParseExact
            startDate: `${startDate}T00:00:00.000Z`, 
            endDate: `${endDate}T00:00:00.000Z`,
            // Time is sent as TimeSpan (HH:mm:ss format)
            startTime: `${startTime}:00`, 
            endTime: `${endTime}:00`,
            courseId: currentCourseData.course.id
        };
        
        const url = `${API_URL_BASE}/CreateDailyPriceRanges`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Key': apiKey,
                },
                body: JSON.stringify(requestData),
            });

            if (response.ok) {
                alert('¡Rangos de precios diarios creados exitosamente!');
                closeDailyRangeModal();
                await refreshCourseData(); 
            } else {
                const error = await response.text();
                alert('Error al crear rangos de precios diarios: ' + error);
            }
        } catch (error) {
            alert('Ocurrió un error de red al crear rangos de precios.');
            console.error(error);
        }
    }
    
    // --- MULTI-DELETE LOGIC ---

    // Function to filter and display ranges based on selected date range for bulk deletion
    // Function to filter and display ranges based on selected date range
function filterAndDisplayRanges() {
    if (!currentCourseData) return;

    const start = multiDeleteStartDate.value;
    const end = multiDeleteEndDate.value;
    
    if (!start || !end) {
        rangesToDeleteList.innerHTML = '<li>Selecciona ambas fechas.</li>';
        confirmMultiDeleteBtn.disabled = true;
        return;
    }

    // --- FIX START: Normalize dates to their absolute UTC boundaries ---
    
    // Create the start of the date range (00:00:00.000 UTC of the selected day)
    const [startY, startM, startD] = start.split('-').map(Number);
    const filterStartUTC = Date.UTC(startY, startM - 1, startD, 0, 0, 0, 0); 
    const filterStartDate = new Date(filterStartUTC);

    // Create the end of the date range (23:59:59.999 UTC of the selected day)
    const [endY, endM, endD] = end.split('-').map(Number);
    const filterEndUTC = Date.UTC(endY, endM - 1, endD, 23, 59, 59, 999);
    const filterEndDate = new Date(filterEndUTC);

    // --- FIX END ---
    
    rangesToDeleteList.innerHTML = '';

    // Find all distinct price ranges that overlap with the selected date period
    const overlappingRanges = currentCourseData.priceRanges.filter(range => {
        // Convert API dates to JavaScript Date objects
        const rangeStart = new Date(range.startDate);
        const rangeEnd = new Date(range.endDate);
        
        // Check for overlap: (RangeStart <= filterEndDate) AND (RangeEnd >= filterStartDate)
        return rangeStart <= filterEndDate && rangeEnd >= filterStartDate;
    });

    if (overlappingRanges.length === 0) {
        rangesToDeleteList.innerHTML = '<li>No se encontraron rangos en este período.</li>';
        confirmMultiDeleteBtn.disabled = true;
        return;
    }
    
    confirmMultiDeleteBtn.disabled = false;
    
    // Populate the list with checkboxes for selection
    overlappingRanges.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    
    overlappingRanges.forEach(range => {
        const listItem = document.createElement('li');
        listItem.style.padding = '5px 10px';
        listItem.style.borderBottom = '1px dotted #eee';
        
        // Format dates and times for display
        const formatDateTime = (isoString) => {
            const date = new Date(isoString);
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric'}) + ' ' + 
                   date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        };

        listItem.innerHTML = `
            <input type="checkbox" data-id="${range.id}" checked>
            €${(range.price / 100).toFixed(2)} | ${formatDateTime(range.startDate)} - ${formatDateTime(range.endDate)}
        `;
        rangesToDeleteList.appendChild(listItem);
    });
}

    async function executeMultiDelete(ids) {
        if (!ids || ids.length === 0) {
            alert('No price ranges selected for deletion.');
            return;
        }

        if (!confirm(`Are you sure you want to delete ${ids.length} price range(s)? This action is permanent.`)) {
            return;
        }

        const url = `${API_URL_BASE}/DeletePriceRanges`;
        
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Key': apiKey,
                },
                body: JSON.stringify(ids),
            });

            if (response.ok) {
                alert(`Successfully deleted ${ids.length} price range(s)!`);
                closeMultiDeleteModal();
                await refreshCourseData(); 
            } else {
                const error = await response.text();
                alert('Failed to delete price ranges: ' + error);
            }
        } catch (error) {
            alert('An error occurred while deleting the price ranges.');
            console.error(error);
        }
    }

    // Event listeners for the multi-delete modal
    multiDeleteStartDate.addEventListener('change', filterAndDisplayRanges);
    multiDeleteEndDate.addEventListener('change', filterAndDisplayRanges);
    
    confirmMultiDeleteBtn.addEventListener('click', () => {
        const selectedIds = Array.from(rangesToDeleteList.querySelectorAll('input[type="checkbox"]:checked'))
                                 .map(input => input.dataset.id);

        executeMultiDelete(selectedIds);
    });

    // --- DAY INFO MODAL LOGIC ---

    function openDayInfoModal(day) {
        const modal = document.getElementById('dayInfoModal');
        const dateEl = document.getElementById('dayInfoDate');
        const listEl = document.getElementById('dayInfoList');
        
        const selectedDate = new Date(currentYear, currentMonth, day);
        dateEl.textContent = selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        listEl.innerHTML = '';
        const dayString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const pricesForDay = currentCourseData.priceRanges.filter(range => {
            const startDate = range.startDate.split('T')[0];
            const endDate = range.endDate.split('T')[0];
            return dayString >= startDate && dayString <= endDate;
        });

        if (pricesForDay.length > 0) {
            pricesForDay.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
            pricesForDay.forEach(range => {
                const listItem = document.createElement('li');
                listItem.classList.add('price-summary-item');
                
                const priceKey = range.price.toString();
                const color = stringToHslColor(priceKey, 70, 50);
                
                const startTime = new Date(range.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const endTime = new Date(range.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                
                listItem.innerHTML = `
                    <span class="color-dot" style="background-color: ${color};"></span>
                    <strong>€${(range.price / 100).toFixed(2)}</strong>: ${startTime} - ${endTime}
                `;
                
                listItem.addEventListener('click', () => {
                    closeDayInfoModal();
                    openEditModal(range);
                });
                
                listEl.appendChild(listItem);
            });
        } else {
            listEl.innerHTML = '<li>No price ranges for this day.</li>';
        }
        
        modal.style.display = 'block';
    }

    // --- INITIALIZATION AND CALENDAR NAVIGATION ---

    if (!apiKey) {
        alert('You must be logged in to view this page.');
        window.location.href = 'login.html';
        return;
    }
    fetchCourseList(apiKey);
    
    prevBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    nextBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });

    // Event listener for creating a single new price range
    createNewBtn.addEventListener('click', () => {
        if (currentCourseData) {
            openEditModal(null);
        } else {
            alert('Please select a course first.');
        }
    });

    // Event listener for creating multiple daily price ranges (NEW)
    createDailyRangesBtn.addEventListener('click', () => {
        openDailyRangeModal();
    });
    deleteDailyRangesBtn.addEventListener('click', () => {
        openMultiDeleteModal();
    });

    // You should add an event listener here if you created a button for openMultiDeleteModal
    // e.g., document.getElementById('open-multi-delete-btn').addEventListener('click', openMultiDeleteModal);
    // For now, it remains accessible via the global function:
    window.openMultiDeleteModal = function() {
        if (!currentCourseData) {
            alert('Please select a course first.');
            return;
        }
        document.getElementById('multiDeleteCourseName').textContent = currentCourseData.course.name;
        // Set default dates
        const today = new Date();
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        multiDeleteStartDate.value = today.toISOString().split('T')[0];
        multiDeleteEndDate.value = lastDayOfMonth.toISOString().split('T')[0];
        
        filterAndDisplayRanges(); // Load ranges automatically on open
        multiDeleteModal.style.display = 'block';
    }
});

// --- GLOBAL MODAL FUNCTIONS (accessible from HTML inline handlers) ---

function closeModal() {
    const modal = document.getElementById('editModal');
    modal.style.display = 'none';
}

function closeDayInfoModal() {
    const modal = document.getElementById('dayInfoModal');
    modal.style.display = 'none';
}

// NEW GLOBAL MODAL FUNCTION
function closeDailyRangeModal() {
    const modal = document.getElementById('dailyRangeModal');
    modal.style.display = 'none';
}

// NEW GLOBAL MODAL FUNCTION
function closeMultiDeleteModal() {
    const modal = document.getElementById('multiDeleteModal');
    modal.style.display = 'none';
}