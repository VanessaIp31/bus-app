// const routeInput = document.getElementById('default-search');
const routeListElement = document.getElementById('route-list')
const baseUrl = 'https://data.etabus.gov.hk/v1/transport/kmb'
const path = {
  routeList: '/route',
  stopList: '/stop',
  routeStop: '/route-stop',
  eta: '/eta',
}
let routeData = [];
let stopData = [];


function hideSearchResultListEvent(event) {
  if (!event.target.closest('#search-box')) {
    routeListElement.hidden = true
    removeHideSearchResultListener()
  }
}

function removeHideSearchResultListener() {
  document.removeEventListener('click', hideSearchResultListEvent)
}

onStart()
async function onStart() {
  routeData = await fetchKmbApi(path.routeList);
  stopData = await fetchKmbApi(path.stopList);
  constructSearchResultList()
  document.getElementById('loading').remove()
}

async function fetchKmbApi(path) {
  const response = await fetch(baseUrl + path);

  if (!response.ok) {
    throw new Error('Could not fetch resource');
  }

  const data = await response.json();
  return data.data
}

function constructSearchResultList(searchText = '') {
  const results = routeData
    .filter((route) => route.route.toUpperCase().startsWith(searchText.trim().toUpperCase()))
    .filter((route) => route.service_type === '1' && route.bound === 'O')
    .map((route) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'flex w-full px-4 py-2 font-medium text-left rtl:text-right border-b border-gray-200 cursor-pointer hover:bg-gray-100 hover:text-red-600 focus:outline-none'
      button.innerHTML = `<span class="text-right mr-4 w-10 h-5 rounded-full bg-red-100 flex justify-center">${route.route}</span>
                <h3> ${route.orig_tc} <> ${route.dest_tc}</h3>`
      button.onclick = () => {
        constructServiceTypeList(route)
        routeListElement.hidden = true
        removeHideSearchResultListener()
        document.getElementById('select-menu').hidden = false
        const routeStopList = document.getElementById('route-stop-list')
        routeStopList.hidden = true
        routeStopList.innerHTML = ''
      }
      return button
    })
  routeListElement.replaceChildren(...results)
}

function constructServiceTypeList(selectedRoute) {
  console.log("I am here!");
  console.log(selectedRoute);
  document.getElementById('dest').innerText = `往${selectedRoute.dest_tc}`;
  document.getElementById('orgin').innerText = `往${selectedRoute.orig_tc}`;
  const outbound = constructServiceTypeListByBound(selectedRoute, 'O')
  const inbound = constructServiceTypeListByBound(selectedRoute, 'I')
  document.getElementById('dest-service-type-list').replaceChildren(...outbound)
  document.getElementById('orgin-service-type-list').replaceChildren(...inbound)
}

function constructServiceTypeListByBound(selectedRoute, bound) {
  const results = routeData
    .filter((route) => route.bound === bound && route.route === selectedRoute.route)

  return results.map((route) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'flex w-full px-4 py-2 font-medium text-left rtl:text-right border-b border-gray-200 cursor-pointer hover:bg-gray-100 hover:text-red-700 focus:outline-none'
    const isSpecial = route.service_type != '1'
    console.log(route.service_type);
    button.innerHTML = `<div class="text-right mr-4 w-20 h-5 rounded-full bg-${isSpecial ? 'red' : 'yellow'}-100 flex justify-center">
          ${isSpecial ? '特別' : '正常'}班次
        </div>
        ${route.orig_tc} > ${route.dest_tc}`
    button.onclick = () => {
      constructOpenStopList(route)
      document.getElementById('route-stop-list').hidden = false
    }
    return button
  })
}

function changeRoute(event) {
  routeListElement.hidden = false
  document.addEventListener('click', hideSearchResultListEvent)
  constructSearchResultList(event.target.value)
}

async function constructOpenStopList(route) {
  console.log('constructOpenStopList');
  console.log(route);
  // /:route/:direction/:service_type
  const routeStopData = await fetchKmbApi(`${path.routeStop}/${route.route}/${route.bound === 'I' ? 'inbound' : 'outbound'}/${route.service_type}`)
  console.log(routeStopData);
  const results = routeStopData.map((routeStop) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'flex w-full px-4 py-2 font-medium text-left rtl:text-right border-b border-gray-200 cursor-pointer hover:bg-gray-100 hover:text-red-700 focus:outline-none'
    const stop = stopData.find((stop) => stop.stop === routeStop.stop)
    button.innerHTML = `<span class="text-right mr-4 w-10 h-5 rounded-full bg-red-100 flex justify-center">
            ${routeStop.seq}
           </span>
           ${stop.name_tc}`
    button.onclick = () => openModal(route, stop)
    return button
  })

  document.getElementById('route-stop-list').replaceChildren(...results)
}

// Get the modal element
const modal = document.getElementById('timeline-modal');

// Function to open the modal
async function openModal(route, stop) {
  modal.style.display = 'flex';
  document.getElementById('stop-name').innerText = stop.name_tc
  // /:stop_id/:route/:service_type
  const etaList = await fetchKmbApi(`${path.eta}/${stop.stop}/${route.route}/${route.service_type}`)

  const results = etaList
    .filter((eta) => eta.dir === route.bound && eta.eta)
    .map((eta) => {
      const parsedEta = new Date(eta.eta);

      const hours = parsedEta.getHours().toString().padStart(2, '0');
      const minutes = parsedEta.getMinutes().toString().padStart(2, '0');

      const formattedTime = hours + ":" + minutes;
      console.log(formattedTime);
      return `<li class="mb-10 ms-8">
            <span
              class="absolute flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full -start-3.5 ring-8 ring-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="grey" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                class="lucide lucide-clock">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
            <div class="flex">
              <div class="w-1/4 sm:w-1/5 text-lg font-semibold text-gray-800">${formattedTime}</div>
              ${scheduledBus(eta)}
            </div>
          </li>`
    })
  document.getElementById('eta-list').innerHTML = results.join('')
}

function scheduledBus(eta) {
  let remark = eta.rmk_tc.length === 0 ? '實時班次' : eta.rmk_tc
  let color = 'red'
  if (eta.rmk_tc === "原定班次") {
    remark = eta.rmk_tc
    color = 'yellow'
  } else if (eta.rmk_tc === "最後班次") {
    remark = eta.rmk_tc
    color = 'green'
  }

  return `<div class="px-3 py-1 text-sm font-semibold bg-${color}-100 text-gray-900 rounded-full">${remark}</div>`
}

// Function to close the modal
function closeModal() {
  modal.style.display = 'none';
}

// Event listener to close the modal when clicking outside the modal content
window.addEventListener('click', (event) => {
  if (event.target === modal) {
    closeModal();
  }
});
