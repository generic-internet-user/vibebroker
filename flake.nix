{
  description = "VibeBroker — browser-based paper trading application";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };

        node = pkgs.nodejs_22;
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            node
            git
            jq
            curl
            wget
          ];

          shellHook = ''
            export NPM_CONFIG_PREFIX="$PWD/.npm-global"
            export NPM_CONFIG_CACHE="$PWD/.npm-cache"

            mkdir -p \
              "$NPM_CONFIG_PREFIX" \
              "$NPM_CONFIG_CACHE"

            export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"

            export XDG_CACHE_HOME="$PWD/.cache"
            export XDG_DATA_HOME="$PWD/.local/share"
            export XDG_STATE_HOME="$PWD/.local/state"

            echo "VibeBroker devshell"
            echo "  Node $(node --version)"
            echo "  npm  $(npm --version)"
            echo ""
            echo "  Commands:"
            echo "    npm install    — install dependencies"
            echo "    npm run dev     — start dev server"
            echo "    npm run build   — build for production"
            echo "    npm run preview — preview production build"
          '';
        };
      });
}
