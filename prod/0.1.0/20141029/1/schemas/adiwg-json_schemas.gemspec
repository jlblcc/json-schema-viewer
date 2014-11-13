# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'adiwg/json_schemas/version'

Gem::Specification.new do |spec|
  spec.name          = "adiwg-json_schemas"
  spec.version       = ADIWG::JsonSchemas::VERSION
  spec.authors       = ["Josh Bradley, Stan Smith"]
  spec.email         = ["jbradley@arcticlcc.org"]
  spec.description   = %q{JSON schemas for validating according to the the ADIwg project and data metadata standard. The schemas comply with JSON Schema draft version 4.}
  spec.summary       = %q{JSON schemas for the ADIwg metadata standard}
  spec.homepage      = "https://github.com/adiwg/adiwg-json-schemas"
  spec.license       = "UNLICENSE"

  spec.files         = `git ls-files`.split($/)
  spec.executables   = spec.files.grep(%r{^bin/}) { |f| File.basename(f) }
  spec.test_files    = spec.files.grep(%r{^(test|spec|features|)/})
  spec.require_paths = ["lib"]

  spec.add_development_dependency "bundler", "~> 1.3"
  spec.add_development_dependency "rake"
  spec.add_development_dependency "json-schema", "~> 2.2"
  spec.add_development_dependency "test-unit"
end
