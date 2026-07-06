{
  description = "VibeBroker – local-first paper trading application";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };

        node = pkgs.nodejs_26;
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            node
            git
            jq
            curl
            wget
            pkg-config
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

            echo "=== VibeBroker DevShell ==="
            echo "Node  $(node --version)"
            echo "npm   $(npm --version)"
            echo ""
            echo "Quick start:"
            echo "  npm run dev     – start Vite dev server"
            echo "  npm run build   – production build"
            echo "  npm run preview – preview production build"
          '';
        };
      });
}
