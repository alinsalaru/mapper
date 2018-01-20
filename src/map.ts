import { StringElementSelector } from "selectors";
import { ElementOperation, SourceElementOperation, Operation, OperationConfiguration } from "operations";
import { IConfiguration, Configuration } from "configuration";

export interface IGenericMap {}

export interface IMap<S, D> extends IGenericMap{
    withConfiguration: (mapConfiguration: (configurationObject: IConfiguration) => void) => this;
	forMember: ( selector: StringElementSelector<D>, operation: ElementOperation<S> ) => this;
	forSourceMember: ( selector: StringElementSelector<S>, operation: SourceElementOperation<D> ) => this;
	map: (sourceEntity: S, destinationEntity?: D) => D;
}

export class Map<S, D> implements IMap<S, D>{

	private _destOperations: Operation<D, S>[] = [];
    private _sourceOperations: Operation<S, D>[] = [];

	constructor(
        private DestinationClass: { new(): D },
        private _configuration: Configuration = new Configuration()
    ) {}
    
    private filterOperationsBySelector(selector: StringElementSelector<S> | StringElementSelector<D>) {
        this._destOperations = this._destOperations.filter(opt => opt.selector !== selector);
        this._sourceOperations = this._sourceOperations.filter(opt => opt.selector !== selector);
    }

    withConfiguration: (mapConfiguration: (configurationObject: IConfiguration) => void) => this =
        (mapConfiguration) => {
            mapConfiguration(this._configuration);
            return this;
        }

	forMember: (selector: StringElementSelector<D>, operation: ElementOperation<S>) => this =
		(selector, operation) => {
            this.filterOperationsBySelector(selector);
			this._destOperations.push({
				selector,
				operation
			});
			return this;
		};

	forSourceMember: (selector: StringElementSelector<S>, operation: ElementOperation<D>) => this =
		(selector, operation) => {
            this.filterOperationsBySelector(selector);
			this._sourceOperations.push({
				selector,
				operation
			});
			return this;
		};

	map: (sourceEntity: S, destinationEntity?: D) => D = 
		(source, destination) => {
			if (!source)
				return;
			let destinationObject: D = destination !== undefined ? destination : new this.DestinationClass();
			let mappedProperties: string[] = [];
			for(let destOperation of this._destOperations){
				let operationConfiguration = new OperationConfiguration<S>(source);
				let newValue = destOperation.operation(operationConfiguration) as any;
				if(newValue !== undefined)
					destinationObject[destOperation.selector] = newValue;
				mappedProperties.push(destOperation.selector);
			}
			for(let sourceOperation of this._sourceOperations){
				let operationConfiguration = new OperationConfiguration<D>(destinationObject);
				let newValue = sourceOperation.operation(operationConfiguration) as any;
				if(newValue !== undefined)
					source[sourceOperation.selector] = newValue;
				mappedProperties.push(sourceOperation.selector);
            }
            if (!this._configuration.explicitlySetProperties) {
                for(let key in source){
                    if (source[key] !== undefined && mappedProperties.indexOf(key) == -1) {
                        const destinationHasTheProperty = Object.keys(destinationObject).indexOf(key) > -1;
                        const shouldMap = destinationHasTheProperty || !this._configuration.ignoreSourcePropertiesIfNotInDestination;
                        if (shouldMap) {
                            (destinationObject as D & {
                                [index: string]: any;
                            })[key] = source[key];
                        }
                    }
                }
            }
			return destinationObject;
		};
};
