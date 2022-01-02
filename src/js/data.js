const Data = (() => {
    /**
     * Define the public elements.
     */
    let self = {};

    
    self.getCountriesData = async () => {
        let countries;

        await d3.tsv("../data/countries.tsv", d => (
            {
                alpha2: d["#alpha2"],
                country: d.country,
                continent: d.continent,
            }
        )).then(data => {
            countries = data;
        });

        return countries;
    };


    self.getPlacesData = async () => {
        let places;

        await d3.tsv("../data/places.tsv", d => (
            {
                placeId: +d["#place_id"],
                distance: +d.distance,
                alpha2: d.country,
            }
        )).then(data => {
            places = data;
        });

        return places;
    };


    return self;
})();