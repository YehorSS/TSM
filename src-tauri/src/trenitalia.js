// Открывает на сайте Trenitalia (в окне приложения) список поездов на нужный маршрут и время.
// Ссылок с параметрами у Trenitalia нет, но свой поиск сайт держит в sessionStorage['session'] и
// показывает результаты прямо оттуда. Скрипт выполняется до кода сайта при каждой загрузке:
// ждёт, пока сайт создаст session, делает тот же запрос поиска, что и сам сайт (внутри страницы —
// с её cookies), кладёт ответ туда, где сайт его ищет, и открывает страницу результатов.
// Если Trenitalia переделает сайт — откроется обычная форма поиска, ничего не сломается.
(function () {
  if (window.top !== window || location.host !== 'www.lefrecce.it') return
  if (sessionStorage.getItem('tsm_done')) return
  sessionStorage.setItem('tsm_done', '1')
  const P = __TSM_PARAMS__ // { origin, destination, date: мс полуночи, time: мс отправления, local: 'YYYY-MM-DDTHH:MM:00.000' }

  function ready() {
    try {
      const s = JSON.parse(sessionStorage.getItem('session') || 'null')
      return s && s.ticketCriteria ? s : null
    } catch (e) {
      return null
    }
  }

  let tries = 0
  const timer = setInterval(function () {
    if (++tries > 100) return clearInterval(timer)
    if (!ready()) return
    clearInterval(timer)
    fetch('/Channels.Website.BFF.WEB/website/ticket/solutions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        departureLocationId: P.origin.id,
        arrivalLocationId: P.destination.id,
        departureTime: P.local,
        adults: 1,
        children: 0,
        criteria: { frecceOnly: false, regionalOnly: false, noChanges: false, order: 'DEPARTURE_DATE', limit: 10, offset: 0 },
        advancedSearchRequest: { bestFare: false },
      }),
    })
      .then(function (r) {
        return r.ok ? r.json() : Promise.reject(r.status)
      })
      .then(function (resp) {
        const s = ready()
        const tc = s.ticketCriteria
        const iso = new Date(P.time).toISOString()
        tc.origin = P.origin
        tc.destination = P.destination
        tc.departureDate = P.date
        tc.departureTime = P.time
        tc.roundTrip = false
        if (tc.departureDates) tc.departureDates['0'] = iso
        if (tc.departureTimes) tc.departureTimes['0'] = iso
        s.solutions = resp.solutions
        s.searchSolutionsResponse = resp
        s.cartId = resp.cartId
        s.currentStep = 2
        sessionStorage.setItem('session', JSON.stringify(s))
        location.replace('https://www.lefrecce.it/Channels.Website.WEB/#/search-results')
        location.reload()
      })
      .catch(function () {})
  }, 200)
})()
