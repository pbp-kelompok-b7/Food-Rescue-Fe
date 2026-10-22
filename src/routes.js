export const pages = [
  {
    "key": "landing",
    "path": "/",
    "title": "Food Rescue",
    "access": "public"
  },
  {
    "key": "login",
    "path": "/login",
    "title": "Masuk",
    "access": "public"
  },
  {
    "key": "register",
    "path": "/register",
    "title": "Daftar akun",
    "access": "public"
  },
  {
    "key": "profile",
    "path": "/profile",
    "title": "Profil",
    "access": "authenticated"
  },
  {
    "key": "supply",
    "path": "/supply",
    "title": "Supply pangan",
    "access": "public"
  },
  {
    "key": "supplyDetail",
    "path": "/supply/:id",
    "title": "Detail supply",
    "access": "public"
  },
  {
    "key": "supplyCreate",
    "path": "/supply/new",
    "title": "Buat supply",
    "access": "authenticated"
  },
  {
    "key": "supplyEdit",
    "path": "/supply/:id/edit",
    "title": "Edit supply",
    "access": "authenticated"
  },
  {
    "key": "mySupply",
    "path": "/my/supply",
    "title": "Supply saya",
    "access": "authenticated"
  },
  {
    "key": "claim",
    "path": "/supply/:id/claim",
    "title": "Ajukan claim",
    "access": "authenticated"
  },
  {
    "key": "requests",
    "path": "/requests",
    "title": "Request Board",
    "access": "public"
  },
  {
    "key": "requestDetail",
    "path": "/requests/:id",
    "title": "Detail request",
    "access": "public"
  },
  {
    "key": "requestCreate",
    "path": "/requests/new",
    "title": "Buat request",
    "access": "authenticated"
  },
  {
    "key": "requestEdit",
    "path": "/requests/:id/edit",
    "title": "Edit request",
    "access": "authenticated"
  },
  {
    "key": "myRequests",
    "path": "/my/requests",
    "title": "Request saya",
    "access": "authenticated"
  },
  {
    "key": "offer",
    "path": "/requests/:id/offer",
    "title": "Tawarkan resource",
    "access": "authenticated"
  },
  {
    "key": "reservations",
    "path": "/reservations",
    "title": "Reservation",
    "access": "authenticated"
  },
  {
    "key": "reservationDetail",
    "path": "/reservations/:id",
    "title": "Detail reservation",
    "access": "authenticated"
  },
  {
    "key": "reservationEdit",
    "path": "/reservations/:id/edit",
    "title": "Revisi quantity",
    "access": "authenticated"
  },
  {
    "key": "pickupSchedule",
    "path": "/reservations/:id/pickup",
    "title": "Jadwalkan pickup",
    "access": "authenticated"
  },
  {
    "key": "pickups",
    "path": "/pickups",
    "title": "Pickup",
    "access": "authenticated"
  },
  {
    "key": "pickupDetail",
    "path": "/pickups/:id",
    "title": "Detail pickup",
    "access": "authenticated"
  },
  {
    "key": "pickupEdit",
    "path": "/pickups/:id/edit",
    "title": "Instruksi pickup",
    "access": "authenticated"
  },
  {
    "key": "admin",
    "path": "/admin",
    "title": "Moderasi",
    "access": "admin"
  },
  {
    "key": "adminUsers",
    "path": "/admin/users",
    "title": "Moderasi users",
    "access": "admin"
  },
  {
    "key": "adminListings",
    "path": "/admin/listings",
    "title": "Moderasi listings",
    "access": "admin"
  },
  {
    "key": "adminRequests",
    "path": "/admin/requests",
    "title": "Moderasi requests",
    "access": "admin"
  },
  {
    "key": "adminReservations",
    "path": "/admin/reservations",
    "title": "Moderasi reservations",
    "access": "admin"
  },
  {
    "key": "adminPickups",
    "path": "/admin/pickups",
    "title": "Moderasi pickups",
    "access": "admin"
  },
  {
    "key": "adminUsersDetail",
    "path": "/admin/users/:id",
    "title": "Detail moderasi users",
    "access": "admin"
  },
  {
    "key": "adminListingsDetail",
    "path": "/admin/listings/:id",
    "title": "Detail moderasi listings",
    "access": "admin"
  },
  {
    "key": "adminRequestsDetail",
    "path": "/admin/requests/:id",
    "title": "Detail moderasi requests",
    "access": "admin"
  },
  {
    "key": "adminReservationsDetail",
    "path": "/admin/reservations/:id",
    "title": "Detail moderasi reservations",
    "access": "admin"
  },
  {
    "key": "adminPickupsDetail",
    "path": "/admin/pickups/:id",
    "title": "Detail moderasi pickups",
    "access": "admin"
  },
  {
    "key": "adminListingsCreate",
    "path": "/admin/listings/new",
    "title": "Buat listings untuk user",
    "access": "admin"
  },
  {
    "key": "adminRequestsCreate",
    "path": "/admin/requests/new",
    "title": "Buat requests untuk user",
    "access": "admin"
  }
]
