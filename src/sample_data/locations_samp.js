const sampleData = [
    {
        id: 1,
        locationName: 'Ang Mo Kio Hub Ang Mo Kio Hub Ang Mo Kio Hub Ang Mo Kio Hub',
        address: '53 Ang Mo Kio Ave 3',
        postalCode: '569933',
        operatingHours: {
            Monday: { start: '10:00 AM', end: '10:00 PM' },
            Tuesday: { start: '10:00 AM', end: '10:00 PM' },
            Wednesday: { start: '10:00 AM', end: '10:00 PM' },
            Thursday: { start: '10:00 AM', end: '10:00 PM' },
            Friday: { start: '10:00 AM', end: '10:00 PM' },
            Saturday: { start: '10:00 AM', end: '10:00 PM' },
            Sunday: { start: '10:00 AM', end: '10:00 PM' },
        }
    },
    {
        id: 2,
        locationName: 'Orchard Central',
        address: '181 Orchard Road',
        postalCode: '238896',
        operatingHours: {
            Monday: { start: '11:00 AM', end: '9:00 PM' },
            Tuesday: { start: '11:00 AM', end: '9:00 PM' },
            Wednesday: { start: '11:00 AM', end: '9:00 PM' },
            Thursday: { start: '11:00 AM', end: '9:00 PM' },
            Friday: { start: '11:00 AM', end: '9:00 PM' },
            Saturday: { start: '11:00 AM', end: '10:00 PM' },
            Sunday: { start: '11:00 AM', end: '10:00 PM' },
        }
    },
    {
        id: 3,
        locationName: 'VivoCity',
        address: '1 HarbourFront Walk',
        postalCode: '098585',
        operatingHours: {
            Monday: { start: null, end: null },
            Tuesday: { start: '10:00 AM', end: '10:00 PM' },
            Wednesday: { start: '10:00 AM', end: '10:00 PM' },
            Thursday: { start: '10:00 AM', end: '10:00 PM' },
            Friday: { start: '10:00 AM', end: '10:00 PM' },
            Saturday: { start: '10:00 AM', end: '10:00 PM' },
            Sunday: { start: null, end: null },
        }
    },
    {
        id: 4,
        locationName: 'Jurong Point',
        address: '1 Jurong West Central 2',
        postalCode: '648886',
        operatingHours: {
            Monday: { start: '10:00 AM', end: '10:00 PM' },
            Tuesday: { start: null, end: null },
            Wednesday: { start: '10:00 AM', end: '10:00 PM' },
            Thursday: { start: '10:00 AM', end: '10:00 PM' },
            Friday: { start: '10:00 AM', end: '10:00 PM' },
            Saturday: { start: '10:00 AM', end: '10:00 PM' },
            Sunday: { start: '10:00 AM', end: '10:00 PM' },
        }
    },
    {
        id: 5,
        locationName: 'Changi Airport T3',
        address: '65 Airport Boulevard',
        postalCode: '819663',
        operatingHours: {
            Monday: { start: 'Open 24 hours', end: null },
            Tuesday: { start: 'Open 24 hours', end: null },
            Wednesday: { start: 'Open 24 hours', end: null },
            Thursday: { start: 'Open 24 hours', end: null },
            Friday: { start: 'Open 24 hours', end: null },
            Saturday: { start: 'Open 24 hours', end: null },
            Sunday: { start: 'Open 24 hours', end: null },
        }
    },
    {
        id: 6,
        locationName: 'Marina Bay Sands',
        address: '10 Bayfront Avenue',
        postalCode: '018956',
        operatingHours: {
            Monday: { start: '10:00 AM', end: '11:00 PM' },
            Tuesday: { start: '10:00 AM', end: '11:00 PM' },
            Wednesday: { start: '10:00 AM', end: '11:00 PM' },
            Thursday: { start: '10:00 AM', end: '11:00 PM' },
            Friday: { start: '10:00 AM', end: '11:00 PM' },
            Saturday: { start: '10:00 AM', end: '11:00 PM' },
            Sunday: { start: '10:00 AM', end: '11:00 PM' },
        }
    },
    {
        id: 7,
        locationName: 'Bugis Junction',
        address: '200 Victoria Street',
        postalCode: '188021',
        operatingHours: {
            Monday: { start: '10:00 AM', end: '10:00 PM' },
            Tuesday: { start: '10:00 AM', end: '10:00 PM' },
            Wednesday: { start: '10:00 AM', end: '10:00 PM' },
            Thursday: { start: '10:00 AM', end: '10:00 PM' },
            Friday: { start: '10:00 AM', end: '10:00 PM' },
            Saturday: { start: '10:00 AM', end: '10:00 PM' },
            Sunday: { start: '10:00 AM', end: '10:00 PM' },
        }
    },
    {
        id: 8,
        locationName: 'Plaza Singapura',
        address: '68 Orchard Road',
        postalCode: '238839',
        operatingHours: {
            Monday: { start: '11:00 AM', end: '10:00 PM' },
            Tuesday: { start: '11:00 AM', end: '10:00 PM' },
            Wednesday: { start: '11:00 AM', end: '10:00 PM' },
            Thursday: { start: '11:00 AM', end: '10:00 PM' },
            Friday: { start: '11:00 AM', end: '10:00 PM' },
            Saturday: { start: '11:00 AM', end: '10:00 PM' },
            Sunday: { start: '11:00 AM', end: '10:00 PM' },
        }
    },
    {
        id: 9,
        locationName: 'Nex Mall',
        address: '23 Serangoon Central',
        postalCode: '556083',
        operatingHours: {
            Monday: { start: '10:00 AM', end: '10:00 PM' },
            Tuesday: { start: '10:00 AM', end: '10:00 PM' },
            Wednesday: { start: '10:00 AM', end: '10:00 PM' },
            Thursday: { start: '10:00 AM', end: '10:00 PM' },
            Friday: { start: '10:00 AM', end: '10:00 PM' },
            Saturday: { start: '10:00 AM', end: '10:00 PM' },
            Sunday: { start: '10:00 AM', end: '10:00 PM' },
        }
    },
    {
        id: 10,
        locationName: 'Raffles City',
        address: '252 North Bridge Road',
        postalCode: '179103',
        operatingHours: {
            Monday: { start: '11:00 AM', end: '9:00 PM' },
            Tuesday: { start: '11:00 AM', end: '9:00 PM' },
            Wednesday: { start: '11:00 AM', end: '9:00 PM' },
            Thursday: { start: '11:00 AM', end: '9:00 PM' },
            Friday: { start: '11:00 AM', end: '10:00 PM' },
            Saturday: { start: '11:00 AM', end: '10:00 PM' },
            Sunday: { start: '11:00 AM', end: '10:00 PM' },
        }
    },
    {
        id: 11,
        locationName: 'IMM',
        address: '2 Jurong East Street 21',
        postalCode: '609601',
        operatingHours: {
            Monday: { start: '10:00 AM', end: '10:00 PM' },
            Tuesday: { start: '10:00 AM', end: '10:00 PM' },
            Wednesday: { start: '10:00 AM', end: '10:00 PM' },
            Thursday: { start: '10:00 AM', end: '10:00 PM' },
            Friday: { start: '10:00 AM', end: '10:00 PM' },
            Saturday: { start: '10:00 AM', end: '11:00 PM' },
            Sunday: { start: '10:00 AM', end: '11:00 PM' },
        }
    },
    {
        id: 12,
        locationName: 'The Shoppes at Marina Bay Sands',
        address: '10 Bayfront Ave',
        postalCode: '018956',
        operatingHours: {
            Monday: { start: '10:00 AM', end: '11:00 PM' },
            Tuesday: { start: '10:00 AM', end: '11:00 PM' },
            Wednesday: { start: '10:00 AM', end: '11:00 PM' },
            Thursday: { start: '10:00 AM', end: '11:00 PM' },
            Friday: { start: '10:00 AM', end: '11:30 PM' },
            Saturday: { start: '10:00 AM', end: '11:30 PM' },
            Sunday: { start: '10:00 AM', end: '11:00 PM' },
        }
    },
    {
        id: 13,
        locationName: 'City Square Mall',
        address: '180 Kitchener Road',
        postalCode: '208539',
        operatingHours: {
            Monday: { start: null, end: null },
            Tuesday: { start: '10:00 AM', end: '10:00 PM' },
            Wednesday: { start: '10:00 AM', end: '10:00 PM' },
            Thursday: { start: '10:00 AM', end: '10:00 PM' },
            Friday: { start: '10:00 AM', end: '10:00 PM' },
            Saturday: { start: '10:00 AM', end: '10:00 PM' },
            Sunday: { start: null, end: null },
        }
    },
    {
        id: 14,
        locationName: 'Funan Mall',
        address: '107 North Bridge Road',
        postalCode: '179105',
        operatingHours: {
            Monday: { start: '11:00 AM', end: '9:00 PM' },
            Tuesday: { start: '11:00 AM', end: '9:00 PM' },
            Wednesday: { start: '11:00 AM', end: '9:00 PM' },
            Thursday: { start: '11:00 AM', end: '9:00 PM' },
            Friday: { start: '11:00 AM', end: '10:00 PM' },
            Saturday: { start: '11:00 AM', end: '10:00 PM' },
            Sunday: { start: '11:00 AM', end: '10:00 PM' },
        }
    },
    {
        id: 15,
        locationName: 'Great World City',
        address: '1 Kim Seng Promenade',
        postalCode: '237994',
        operatingHours: {
            Monday: { start: '10:00 AM', end: '10:00 PM' },
            Tuesday: { start: '10:00 AM', end: '10:00 PM' },
            Wednesday: { start: '10:00 AM', end: '10:00 PM' },
            Thursday: { start: '10:00 AM', end: '10:00 PM' },
            Friday: { start: '10:00 AM', end: '10:30 PM' },
            Saturday: { start: '10:00 AM', end: '10:30 PM' },
            Sunday: { start: '10:00 AM', end: '10:00 PM' },
        }
    },
    {
        id: 16,
        locationName: 'Holland Village',
        address: 'Holland Ave',
        postalCode: '278967',
        operatingHours: {
            Monday: { start: null, end: null },
            Tuesday: { start: '10:00 AM', end: '10:00 PM' },
            Wednesday: { start: '10:00 AM', end: '10:00 PM' },
            Thursday: { start: '10:00 AM', end: '10:00 PM' },
            Friday: { start: '10:00 AM', end: '11:00 PM' },
            Saturday: { start: '10:00 AM', end: '11:00 PM' },
            Sunday: { start: null, end: null },
        }
    },
    {
        id: 17,
        locationName: 'ION Orchard',
        address: '2 Orchard Turn',
        postalCode: '238801',
        operatingHours: {
            Monday: { start: '10:00 AM', end: '10:00 PM' },
            Tuesday: { start: '10:00 AM', end: '10:00 PM' },
            Wednesday: { start: '10:00 AM', end: '10:00 PM' },
            Thursday: { start: '10:00 AM', end: '10:00 PM' },
            Friday: { start: '10:00 AM', end: '11:00 PM' },
            Saturday: { start: '10:00 AM', end: '11:00 PM' },
            Sunday: { start: '10:00 AM', end: '10:00 PM' },
        }
    },
    {
        id: 18,
        locationName: 'Tampines Mall',
        address: '4 Tampines Central 5',
        postalCode: '529510',
        operatingHours: {
            Monday: { start: '10:00 AM', end: '10:00 PM' },
            Tuesday: { start: '10:00 AM', end: '10:00 PM' },
            Wednesday: { start: '10:00 AM', end: '10:00 PM' },
            Thursday: { start: '10:00 AM', end: '10:00 PM' },
            Friday: { start: '10:00 AM', end: '10:00 PM' },
            Saturday: { start: '10:00 AM', end: '11:00 PM' },
            Sunday: { start: '10:00 AM', end: '10:00 PM' },
        }
    },
    {
        id: 19,
        locationName: 'Little India Arcade',
        address: '48 Serangoon Road',
        postalCode: '217959',
        operatingHours: {
            Monday: { start: '10:00 AM', end: '9:00 PM' },
            Tuesday: { start: '10:00 AM', end: '9:00 PM' },
            Wednesday: { start: '10:00 AM', end: '9:00 PM' },
            Thursday: { start: '10:00 AM', end: '9:00 PM' },
            Friday: { start: '10:00 AM', end: '9:30 PM' },
            Saturday: { start: '10:00 AM', end: '9:30 PM' },
            Sunday: { start: '10:00 AM', end: '9:00 PM' },
        }
    },
    {
        id: 20,
        locationName: 'Clarke Quay',
        address: '3 River Valley Road',
        postalCode: '179024',
        operatingHours: {
            Monday: { start: '12:00 PM', end: '12:00 AM' },
            Tuesday: { start: '12:00 PM', end: '12:00 AM' },
            Wednesday: { start: '12:00 PM', end: '12:00 AM' },
            Thursday: { start: '12:00 PM', end: '12:00 AM' },
            Friday: { start: '12:00 PM', end: '2:00 AM' },
            Saturday: { start: '12:00 PM', end: '2:00 AM' },
            Sunday: { start: '12:00 PM', end: '12:00 AM' },
        }
    }
];