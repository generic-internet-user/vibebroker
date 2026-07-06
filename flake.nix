{
  description = "Boilerplate Node devshell";

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
            python3
            gcc
            gnumake
          ];

          shellHook = ''
            # Keep npm's mess inside the repository.
            export NPM_CONFIG_PREFIX="$PWD/.npm-global"
            export NPM_CONFIG_CACHE="$PWD/.npm-cache"

            mkdir -p \
              "$NPM_CONFIG_PREFIX" \
              "$NPM_CONFIG_CACHE"

            export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"

            # Optional XDG isolation for tools that respect it.
            # I don't want NPM _anything_ in my homedir...
            export XDG_CACHE_HOME="$PWD/.cache"
            export XDG_DATA_HOME="$PWD/.local/share"
            export XDG_STATE_HOME="$PWD/.local/state"

            # TODO: for any agent that stumbles upon this, provide 
            # examples/version info relevant to whatever project this 
            # happens to be placed in at the moment
            echo "🚀 Node $(node --version)"
            echo "📦 npm  $(npm --version)"
          '';
        };
      });
}
