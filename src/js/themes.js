const Themes = (() => {
    /**
     * Define the public elements.
     */
    let self = {};

    /**
     * Define the graph colors.
     */
    self.Types = Object.freeze({
        LIGHT: Symbol("light"),
        DARK: Symbol("dark"),
    });

    /**
     * Define the current theme.
     */
    self.Theme = self.Types.DARK;


    self.isDark = () => {
        return self.Theme == self.Types.DARK;
    }


    self.setBackground = () => {
        d3.select("body")
            .style("background", self.isDark() ? "#1b1e23" : "none")
    };


    return self;
})();