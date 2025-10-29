{
  description = "Hugo static blog";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            hugo
            git
            bun
            markdownlint-cli2
            nodejs
            imagemagick
          ];

          shellHook = ''
            echo "Hugo development environment"
            echo "Hugo version: $(hugo version)"
            echo "Bun version: $(bun --version)"
            echo "Node version: $(node --version)"

            # Install dependencies if needed
            if [ ! -d "node_modules" ]; then
              echo "Installing dependencies..."
              bun install
            fi
          '';
        };

        packages.default = pkgs.stdenv.mkDerivation {
          name = "sbahri-blog";
          src = ./.;

          buildInputs = with pkgs; [
            hugo
            bun
            nodejs
          ];

          buildPhase = ''
            export HOME=$TMPDIR
            bun install
            bun run build
          '';

          installPhase = ''
            cp -r public $out
          '';
        };
      }
    );
}
